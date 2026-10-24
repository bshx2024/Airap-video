import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { oneTap } from 'better-auth/plugins';

import { db } from '@/core/db';
import { isCloudflareWorker, TCP_PROVIDERS } from '@/core/db/runtime';
import { resolveEmailBrand } from '@/core/email/brand';
import {
  getEmailProvider,
  isEmailConfigured,
} from '@/core/email/resolve-provider';
import { sendPasswordResetEmail } from '@/core/email/send-password-reset';
import { VerifyEmail } from '@/core/email/templates/verify-email';
import { AUTH_SECRET_PLACEHOLDER, envConfigs } from '@/config';
import * as schema from '@/config/db/schema';
import { getAllConfigs } from '@/modules/config/service';
import { grantForNewUser } from '@/modules/credits/service';
import { grantRoleForNewUser } from '@/modules/rbac/service';
import {
  getClientIpFromCtx,
  getCookieFromCtx,
  getHeaderValue,
  guessLocaleFromAcceptLanguage,
} from '@/lib/cookie';
import { getUuid } from '@/lib/hash';
import {
  PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS,
  passwordResetVerificationIdentifier,
} from '@/lib/password-reset';

function assertProductionAuthSecret() {
  // Only enforce at runtime in production.
  if (process.env.NODE_ENV !== 'production') return;
  const secret = envConfigs.auth_secret;
  if (!secret || secret === AUTH_SECRET_PLACEHOLDER) {
    throw new Error(
      'AUTH_SECRET is missing or still set to the development placeholder. ' +
        'Generate one with `openssl rand -base64 32` and set it before serving traffic.'
    );
  }
}

const recentVerificationEmailSentAt = new Map<string, number>();
const VERIFICATION_EMAIL_MIN_INTERVAL_MS = 60_000;

function getDatabaseProvider(provider: string): 'sqlite' | 'pg' | 'mysql' {
  switch (provider) {
    case 'sqlite':
    case 'turso':
    case 'd1':
      return 'sqlite';
    case 'postgresql':
    case 'postgres':
      return 'pg';
    case 'mysql':
      return 'mysql';
    default:
      throw new Error(`Unsupported database provider for auth: ${provider}`);
  }
}

// workerd forbids reusing TCP sockets across requests ("Cannot perform I/O on
// behalf of a different request"). drizzleAdapter(db()) bakes the postgres/
// mysql client in at construction, so a cached auth instance makes an OAuth
// callback query `verification` with the initiating request's client —
// better-auth swallows the error as please_restart_the_process. Rebuild per
// request on Workers; db() hands out that request's own client there.

const canCacheAuthInstance = !(
  isCloudflareWorker && TCP_PROVIDERS.includes(envConfigs.database_provider)
);

let authInstance: any;
let socialConfigsSignature = '';
let emailEnabledLoaded = true;
let emailVerificationEnabledLoaded = false;

function getSocialProviders(configs: Record<string, string>) {
  const providers: Record<string, any> = {};

  if (configs.google_client_id && configs.google_client_secret) {
    providers.google = {
      clientId: configs.google_client_id,
      clientSecret: configs.google_client_secret,
    };
  }

  if (configs.github_client_id && configs.github_client_secret) {
    providers.github = {
      clientId: configs.github_client_id,
      clientSecret: configs.github_client_secret,
    };
  }

  return providers;
}

function getSocialSignature(configs: Record<string, string>) {
  return [
    configs.google_client_id || '',
    configs.google_client_secret || '',
    configs.github_client_id || '',
    configs.github_client_secret || '',
    // Including the one-tap flag here so toggling it without changing
    // credentials still rebuilds authInstance (which owns the plugin list).
    configs.google_one_tap_enabled || '',
  ].join('|');
}

function getAuthPlugins(configs: Record<string, string> | undefined) {
  if (!configs) return [];
  const plugins: any[] = [];
  if (configs.google_client_id && configs.google_one_tap_enabled === 'true') {
    plugins.push(oneTap());
  }
  return plugins;
}

export function getAuth(configs?: Record<string, string>) {
  assertProductionAuthSecret();
  // Rebuild if any social provider credential changed
  if (configs) {
    const nextSignature = getSocialSignature(configs);
    if (nextSignature !== socialConfigsSignature) {
      authInstance = null;
      socialConfigsSignature = nextSignature;
    }
  }

  // Rebuild if the email-auth flag changed
  if (configs) {
    const nextEmailEnabled = configs.email_auth_enabled !== 'false';
    if (nextEmailEnabled !== emailEnabledLoaded) {
      authInstance = null;
      emailEnabledLoaded = nextEmailEnabled;
    }
  }

  // Rebuild if the email-verification flag changed
  if (configs) {
    const nextVerificationEnabled =
      configs.email_verification_enabled === 'true' &&
      isEmailConfigured(configs);
    if (nextVerificationEnabled !== emailVerificationEnabledLoaded) {
      authInstance = null;
      emailVerificationEnabledLoaded = nextVerificationEnabled;
    }
  }

  if (authInstance) return authInstance;

  const socialProviders = configs ? getSocialProviders(configs) : {};
  const emailAndPasswordEnabled = configs
    ? configs.email_auth_enabled !== 'false'
    : true;
  const emailVerificationEnabled = configs
    ? configs.email_verification_enabled === 'true' &&
      isEmailConfigured(configs)
    : false;
  const appName = configs?.app_name || envConfigs.app_name;
  const appUrl = configs?.app_url || envConfigs.app_url;
  const authUrl = configs?.auth_url || envConfigs.auth_url || appUrl;

  const instance = betterAuth({
    appName,
    baseURL: authUrl,
    secret: envConfigs.auth_secret,
    trustedOrigins: (request) => {
      const origins: string[] = [];
      if (appUrl) origins.push(appUrl);
      // AUTH_TRUSTED_ORIGINS: comma-separated extra origins. Entries starting
      // with a dot are hostname-suffix wildcards (`.e2b.app` trusts every
      // per-sandbox preview domain, e.g. https://3000-<id>.e2b.app); anything
      // else must match the request origin exactly.
      const extra = (process.env.AUTH_TRUSTED_ORIGINS || '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      origins.push(...extra.filter((rule) => !rule.startsWith('.')));
      try {
        const origin = request?.headers?.get?.('origin');
        if (origin) {
          const host = new URL(origin).hostname;
          if (host === 'localhost') origins.push(origin);
          const suffixMatched = extra.some(
            (rule) =>
              rule.startsWith('.') &&
              (host === rule.slice(1) || host.endsWith(rule))
          );
          if (suffixMatched) origins.push(origin);
        }
      } catch {}
      return origins;
    },
    database: drizzleAdapter(db(), {
      provider: getDatabaseProvider(envConfigs.database_provider),
      schema,
    }),
    socialProviders,
    plugins: getAuthPlugins(configs),
    account: {
      accountLinking: {
        // Never attach an OAuth sign-in to a password account whose email was
        // never proven: otherwise anyone could pre-register a victim's email,
        // wait for them to "Sign in with Google", and keep the password.
        // (The better-auth default since 1.7; pinned so it can't regress.)
        requireLocalEmailVerified: true,
      },
    },
    user: {
      additionalFields: {
        utmSource: {
          type: 'string',
          input: false,
          required: false,
          defaultValue: '',
        },
        ip: { type: 'string', input: false, required: false, defaultValue: '' },
        locale: {
          type: 'string',
          input: false,
          required: false,
          defaultValue: '',
        },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (userData: any, ctx: any) => {
            let utmSource = getCookieFromCtx(ctx, 'utm_source') || '';
            try {
              utmSource = decodeURIComponent(utmSource);
            } catch {}
            utmSource = utmSource.replace(/[^\w.\-]/g, '').slice(0, 100);

            return {
              data: {
                ...userData,
                utmSource,
                ip: getClientIpFromCtx(ctx).slice(0, 100),
                locale: guessLocaleFromAcceptLanguage(
                  getHeaderValue(ctx, 'accept-language')
                ),
              },
            };
          },
          after: async (createdUser: any) => {
            // Onboarding side effects. Read configs fresh: authInstance is
            // cached, so the `configs` captured at build time can be stale
            // after an admin settings save.
            const all = await getAllConfigs().catch((error) => {
              console.error('[auth] new user hook: load configs failed', error);
              return null;
            });
            if (!all) return;

            try {
              await grantRoleForNewUser({
                userId: createdUser.id,
                configs: all,
              });
            } catch (error) {
              console.error('[auth] grant default role failed', error);
            }

            try {
              await grantForNewUser({
                userId: createdUser.id,
                userEmail: createdUser.email,
                configs: all,
              });
            } catch (error) {
              console.error('[auth] grant signup credits failed', error);
            }
          },
        },
      },
    },
    advanced: {
      database: { generateId: () => getUuid() },
    },
    emailAndPassword: {
      enabled: emailAndPasswordEnabled,
      requireEmailVerification: emailVerificationEnabled,
      autoSignIn: !emailVerificationEnabled,
      resetPasswordTokenExpiresIn: PASSWORD_RESET_TOKEN_EXPIRES_IN_SECONDS,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async (
        {
          user,
          url,
          token,
        }: {
          user: any;
          url: string;
          token: string;
        },
        request?: Request
      ) => {
        const all = await getAllConfigs();
        await sendPasswordResetEmail({
          configs: all,
          user,
          url,
          token,
          request,
        });
      },
    },
    // OAuth-only users must not gain a password via reset (better-auth would
    // otherwise create a credential account).
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.method !== 'POST' || ctx.path !== '/reset-password') return;

        const token =
          (typeof ctx.body?.token === 'string' && ctx.body.token) ||
          (typeof ctx.query?.token === 'string' && ctx.query.token) ||
          '';
        if (!token) return;

        const record = await ctx.context.internalAdapter.findVerificationValue(
          passwordResetVerificationIdentifier(token)
        );
        if (!record || record.expiresAt < new Date()) return;

        const accounts = await ctx.context.internalAdapter.findAccounts(
          record.value
        );
        if (accounts.some((item) => item.providerId === 'credential')) {
          return;
        }

        await ctx.context.internalAdapter.deleteVerificationByIdentifier(
          passwordResetVerificationIdentifier(token)
        );
        throw new APIError('BAD_REQUEST', {
          message: 'Invalid token',
        });
      }),
    },
    ...(emailVerificationEnabled
      ? {
          emailVerification: {
            sendOnSignUp: false,
            sendOnSignIn: false,
            autoSignInAfterVerification: true,
            expiresIn: 60 * 60 * 24,
            sendVerificationEmail: async ({
              user,
              url,
            }: {
              user: any;
              url: string;
              token: string;
            }) => {
              try {
                const key = String(user?.email || '').toLowerCase();
                const now = Date.now();
                const last = recentVerificationEmailSentAt.get(key) || 0;
                if (key && now - last < VERIFICATION_EMAIL_MIN_INTERVAL_MS) {
                  return;
                }
                if (key) {
                  recentVerificationEmailSentAt.set(key, now);
                }

                const all = await getAllConfigs();
                const emailCtx = getEmailProvider(all);
                if (!emailCtx) {
                  console.error(
                    '[auth] sendVerificationEmail: No email provider configured'
                  );
                  return;
                }
                const { appName, logoUrl } = resolveEmailBrand(all);
                const result = await emailCtx.provider.sendEmail({
                  to: user.email,
                  subject: `Verify your email - ${appName}`,
                  react: VerifyEmail({ appName, logoUrl, url }),
                });
                if (!result.success) {
                  console.error(
                    '[auth] sendVerificationEmail failed:',
                    result.error
                  );
                }
              } catch (e) {
                console.error('[auth] sendVerificationEmail error:', e);
              }
            },
          },
        }
      : {}),
    logger: { disabled: true },
  } satisfies BetterAuthOptions);

  if (canCacheAuthInstance) authInstance = instance;
  return instance;
}
