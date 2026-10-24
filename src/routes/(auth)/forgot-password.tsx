import { useEffect, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import { requestPasswordReset } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { authErrorMessage } from '@/lib/auth-error';
import { PASSWORD_RESET_RESEND_COOLDOWN_SECONDS } from '@/lib/password-reset';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import { TextField } from '@/components/form-field';
import { SiteBrand } from '@/components/site-brand';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Field, FieldDescription, FieldGroup } from '@/components/ui/field';

const forgotSchema = z.object({
  email: z.string().email(m['common.sign.email_placeholder']()),
});

function getCooldownKey(email: string) {
  return `forgot-password:lastSentAt:${email.trim().toLowerCase()}`;
}

function getCooldownRemainingSeconds(email: string) {
  if (typeof window === 'undefined' || !email.trim()) return 0;
  try {
    const raw = window.localStorage.getItem(getCooldownKey(email));
    const last = raw ? Number(raw) : 0;
    if (!last || Number.isNaN(last)) return 0;
    const elapsed = Math.floor((Date.now() - last) / 1000);
    return Math.max(0, PASSWORD_RESET_RESEND_COOLDOWN_SECONDS - elapsed);
  } catch {
    return 0;
  }
}

function markSentNow(email: string) {
  if (typeof window === 'undefined' || !email.trim()) return;
  try {
    window.localStorage.setItem(getCooldownKey(email), String(Date.now()));
  } catch {
    // ignore
  }
}

function ForgotPasswordPage() {
  const search = Route.useSearch();
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [sentEmail, setSentEmail] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const configQuery = usePublicConfig();
  const configs = configQuery.data ?? {};

  const configsLoaded = configQuery.isSuccess;
  const passwordResetEnabled = configs.password_reset_enabled === 'true';
  const defaultEmail =
    typeof search.email === 'string' ? search.email.trim() : '';

  const form = useForm({
    defaultValues: { email: defaultEmail },
    validators: { onSubmit: forgotSchema },
    onSubmit: async ({ value }) => {
      setError('');
      const email = value.email.trim();
      const remaining = getCooldownRemainingSeconds(email);
      if (remaining > 0) {
        setError(
          m['common.sign.forgot_password_resend_countdown']({
            seconds: remaining,
          })
        );
        return;
      }
      try {
        const origin = window.location.origin;
        const redirectTo = `${origin}${localizeHref('/reset-password')}`;
        const result = await requestPasswordReset({
          email,
          redirectTo,
        });
        if (result.error) {
          const code = String((result.error as { code?: string }).code || '');
          const msg = String(result.error.message || '');
          if (/too many requests/i.test(msg) || result.error.status === 429) {
            setError(m['common.sign.too_many_requests']());
          } else if (
            code === 'PASSWORD_RESET_UNAVAILABLE' ||
            /password reset is not available|reset password isn't enabled/i.test(
              msg
            )
          ) {
            setError(m['common.sign.password_reset_unavailable_description']());
          } else if (
            code === 'USER_NOT_FOUND' ||
            /no account found/i.test(msg)
          ) {
            setError(m['common.sign.forgot_password_email_not_found']());
          } else if (
            code === 'PASSWORD_RESET_OAUTH_ONLY' ||
            /social sign-in/i.test(msg)
          ) {
            setError(m['common.sign.forgot_password_oauth_only']());
          } else {
            setError(
              authErrorMessage(result.error, m['common.error.failed']())
            );
          }
          return;
        }
        // Unregistered / oauth-only are rejected server-side with result.error.
        // better-auth always returns status:true + anti-enumeration message on success.
        markSentNow(email);
        setCooldownSeconds(getCooldownRemainingSeconds(email));
        setSentEmail(email);
        setSent(true);
      } catch (err: any) {
        setError(authErrorMessage(err, m['common.error.failed']()));
      }
    },
  });

  useEffect(() => {
    const tick = () => {
      const email = (form.state.values.email || '').trim();
      setCooldownSeconds(getCooldownRemainingSeconds(email || sentEmail));
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [form, sentEmail]);

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="self-center">
          <SiteBrand />
        </Link>
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">
              {sent
                ? m['common.sign.reset_link_sent_title']()
                : m['common.sign.forgot_password_title']()}
            </CardTitle>
            {!sent && (
              <CardDescription>
                {m['common.sign.forgot_password_description']()}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {configsLoaded && !passwordResetEnabled ? (
              <FieldGroup>
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <p className="text-sm font-medium">
                    {m['common.sign.password_reset_unavailable_title']()}
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {m['common.sign.password_reset_unavailable_description']()}
                  </p>
                </div>
                <Field>
                  <Link
                    href="/sign-in"
                    className="text-center text-sm underline underline-offset-4"
                  >
                    {m['common.sign.back_to_sign_in']()}
                  </Link>
                </Field>
              </FieldGroup>
            ) : sent ? (
              <FieldGroup>
                <p className="text-muted-foreground text-center text-sm">
                  {m['common.sign.reset_link_sent_description']({
                    email: sentEmail,
                  })}
                </p>
                <Field>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={cooldownSeconds > 0}
                    onClick={() => {
                      form.setFieldValue('email', sentEmail);
                      void form.handleSubmit();
                    }}
                  >
                    {cooldownSeconds > 0
                      ? m['common.sign.forgot_password_resend_countdown']({
                          seconds: cooldownSeconds,
                        })
                      : m['common.sign.forgot_password_resend']()}
                  </Button>
                </Field>
                <Field>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground text-center text-xs underline underline-offset-4"
                    onClick={() => {
                      setSent(false);
                      setError('');
                    }}
                  >
                    {m['common.sign.forgot_password_use_another_email']()}
                  </button>
                </Field>
                <Field>
                  <Link
                    href="/sign-in"
                    className="text-center text-sm underline underline-offset-4"
                  >
                    {m['common.sign.back_to_sign_in']()}
                  </Link>
                </Field>
              </FieldGroup>
            ) : (
              <form
                method="post"
                action="#"
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  void form.handleSubmit();
                }}
              >
                <FieldGroup>
                  {error && (
                    <div className="bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
                      {error}
                    </div>
                  )}
                  <form.Field name="email">
                    {(field) => (
                      <TextField
                        field={field}
                        label={m['common.sign.email_title']()}
                        type="email"
                        required
                        placeholder={m['common.sign.email_placeholder']()}
                      />
                    )}
                  </form.Field>
                  <Field>
                    <form.Subscribe selector={(s) => s.isSubmitting}>
                      {(isSubmitting) => (
                        <Button
                          type="submit"
                          disabled={
                            isSubmitting ||
                            cooldownSeconds > 0 ||
                            !configsLoaded
                          }
                        >
                          {isSubmitting
                            ? '...'
                            : cooldownSeconds > 0
                              ? m[
                                  'common.sign.forgot_password_resend_countdown'
                                ]({ seconds: cooldownSeconds })
                              : m['common.sign.send_reset_link']()}
                        </Button>
                      )}
                    </form.Subscribe>
                    <FieldDescription className="text-center">
                      <Link
                        href="/sign-in"
                        className="underline underline-offset-4"
                      >
                        {m['common.sign.back_to_sign_in']()}
                      </Link>
                    </FieldDescription>
                  </Field>
                </FieldGroup>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/(auth)/forgot-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    email: typeof search.email === 'string' ? search.email : undefined,
  }),

  component: ForgotPasswordPage,
});
