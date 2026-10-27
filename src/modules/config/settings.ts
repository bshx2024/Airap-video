/**
 * Settings definitions — tabs, groups, and fields.
 *
 * This drives the admin settings UI. Add new settings here
 * and they'll automatically appear in the admin panel.
 */

export interface Setting {
  name: string;
  title: string;
  type: 'text' | 'password' | 'textarea' | 'number' | 'switch' | 'select';
  placeholder?: string;
  options?: { label: string; value: string }[];
  tip?: string;
  group: string;
  tab: string;
  defaultValue?: string;
}

export interface SettingGroup {
  name: string;
  title: string;
  description?: string;
  tab: string;
  link?: string;
}

export interface SettingTab {
  name: string;
  title: string;
}

export function getSettingTabs(): SettingTab[] {
  return [
    { name: 'general', title: 'General' },
    { name: 'auth', title: 'Auth' },
    { name: 'payment', title: 'Payment' },
    { name: 'email', title: 'Email' },
    { name: 'storage', title: 'Storage' },
    { name: 'ai', title: 'AI' },
    { name: 'analytics', title: 'Analytics' },
    { name: 'ads', title: 'Ads' },
    { name: 'customer_service', title: 'Customer Service' },
    { name: 'notify', title: 'Notify' },
    { name: 'custom', title: 'Custom' },
  ];
}

export function getSettingGroups(): SettingGroup[] {
  return [
    // General
    {
      name: 'appinfo',
      title: 'App Info',
      description: 'Basic application settings',
      tab: 'general',
    },
    {
      name: 'user_role',
      title: 'User Roles',
      description: 'Default role for new users',
      tab: 'general',
    },
    {
      name: 'credit',
      title: 'Credits',
      description: 'Initial credits for new users',
      tab: 'general',
    },

    // Auth
    {
      name: 'email_auth',
      title: 'Email Auth',
      description: 'Email/password authentication',
      tab: 'auth',
    },
    {
      name: 'google_auth',
      title: 'Google Auth',
      description: 'Google OAuth login',
      tab: 'auth',
    },
    {
      name: 'github_auth',
      title: 'GitHub Auth',
      description: 'GitHub OAuth login',
      tab: 'auth',
    },

    // Payment
    {
      name: 'basic_payment',
      title: 'Basic',
      description: 'Payment general settings',
      tab: 'payment',
    },
    {
      name: 'stripe',
      title: 'Stripe',
      description: 'Stripe payment gateway',
      tab: 'payment',
      link: 'https://stripe.com',
    },
    {
      name: 'creem',
      title: 'Creem',
      description: 'Creem payment gateway',
      tab: 'payment',
      link: 'https://creem.io',
    },
    {
      name: 'waffo',
      title: 'Waffo Pancake',
      description: 'Waffo Pancake payment gateway',
      tab: 'payment',
      link: 'https://www.waffo.com',
    },
    {
      name: 'dodo',
      title: 'Dodo Payments',
      description: 'Dodo Payments MoR payment gateway',
      tab: 'payment',
      link: 'https://dodopayments.com',
    },
    {
      name: 'paypal',
      title: 'PayPal',
      description: 'PayPal payment gateway',
      tab: 'payment',
      link: 'https://www.paypal.com',
    },
    {
      name: 'alipay',
      title: 'Alipay',
      description: 'Alipay payment gateway (native)',
      tab: 'payment',
      link: 'https://opendocs.alipay.com',
    },
    {
      name: 'wechat',
      title: 'WeChat Pay',
      description: 'WeChat Pay gateway (native)',
      tab: 'payment',
      link: 'https://pay.weixin.qq.com',
    },

    // Email
    {
      name: 'email_general',
      title: 'General',
      description: 'Email provider selection',
      tab: 'email',
    },
    {
      name: 'resend',
      title: 'Resend',
      description: 'Resend email service',
      tab: 'email',
    },
    {
      name: 'cloudflare_email',
      title: 'Cloudflare Email',
      description: 'Cloudflare Email Service',
      tab: 'email',
    },

    // Storage
    {
      name: 'r2',
      title: 'Cloudflare R2 / S3',
      description: 'Object storage settings',
      tab: 'storage',
    },

    // AI
    {
      name: 'apimart',
      title: 'APIMart',
      description: 'APIMart unified AI API (Image / Video / Audio / LLM)',
      tab: 'ai',
      link: 'https://apimart.ai',
    },
    {
      name: 'kie',
      title: 'KIE AI',
      description: 'KIE AI API (Image / Video / Music)',
      tab: 'ai',
      link: 'https://kie.ai',
    },
    {
      name: 'alibaba',
      title: 'Alibaba Cloud Model Studio (阿里百炼国际版)',
      description: 'HappyHorse 1.1 Video Synthesis & DeepSeek Rap Lyrics LLM',
      tab: 'ai',
      link: 'https://bailian.console.alibabacloud.com',
    },

    // Analytics
    {
      name: 'google_analytics',
      title: 'Google Analytics',
      description: 'Inject gtag.js with the configured Measurement ID',
      tab: 'analytics',
    },
    {
      name: 'plausible',
      title: 'Plausible',
      description: 'Inject plausible.js for self-hosted or cloud Plausible',
      tab: 'analytics',
    },
    {
      name: 'cookie_consent',
      title: 'Cookie Consent',
      description:
        'Show a cookie banner to visitors. Until they accept, Google Analytics runs in Consent Mode (no cookies) and the AdSense script is not loaded. Plausible is cookieless and unaffected.',
      tab: 'analytics',
    },

    // Ads
    {
      name: 'adsense',
      title: 'Google AdSense',
      description:
        'Inject the AdSense script sitewide and serve /ads.txt from the configured publisher ID',
      tab: 'ads',
    },

    // Customer Service
    {
      name: 'crisp',
      title: 'Crisp',
      description: 'Crisp live chat widget',
      tab: 'customer_service',
    },
    {
      name: 'tawk',
      title: 'Tawk.to',
      description: 'Tawk.to live chat widget',
      tab: 'customer_service',
    },

    // Notify
    {
      name: 'notify_settings',
      title: 'Notification Settings',
      description: 'Choose which events push a message to the bots below',
      tab: 'notify',
    },
    {
      name: 'notify_telegram',
      title: 'Telegram Bot',
      description: 'Telegram Bot API sendMessage',
      tab: 'notify',
    },
    {
      name: 'notify_feishu',
      title: 'Feishu / Lark Bot',
      description: 'Feishu custom bot webhook',
      tab: 'notify',
    },
    {
      name: 'notify_wecom',
      title: 'WeCom Bot',
      description: 'WeCom (企业微信) group bot webhook',
      tab: 'notify',
    },
    {
      name: 'notify_webhook',
      title: 'Webhook',
      description:
        'POST JSON to any endpoint — AI agents and automations (Grok bot, Cursor routine, Zapier, n8n…)',
      tab: 'notify',
    },
  ];
}

export function getSettings(): Setting[] {
  return [
    // ─── General / App Info ──────────────────────────────────────────
    {
      name: 'app_name',
      title: 'App Name',
      type: 'text',
      placeholder: 'My App',
      group: 'appinfo',
      tab: 'general',
    },
    {
      name: 'app_description',
      title: 'App Description',
      type: 'textarea',
      placeholder: 'Ship your SaaS faster',
      group: 'appinfo',
      tab: 'general',
    },
    {
      name: 'app_url',
      title: 'App URL',
      type: 'text',
      placeholder: 'https://example.com',
      group: 'appinfo',
      tab: 'general',
    },

    // ─── General / User Roles ────────────────────────────────────────
    {
      name: 'initial_role_enabled',
      title: 'Auto-assign role for new users',
      type: 'switch',
      group: 'user_role',
      tab: 'general',
    },
    {
      name: 'initial_role_name',
      title: 'Default role name',
      type: 'text',
      placeholder: 'viewer',
      group: 'user_role',
      tab: 'general',
    },

    // ─── General / Credits ───────────────────────────────────────────
    {
      name: 'initial_credits_enabled',
      title: 'Grant credits on signup',
      type: 'switch',
      group: 'credit',
      tab: 'general',
    },
    {
      name: 'initial_credits_amount',
      title: 'Credits amount',
      type: 'number',
      placeholder: '100',
      group: 'credit',
      tab: 'general',
    },
    {
      name: 'initial_credits_valid_days',
      title: 'Valid days',
      type: 'number',
      placeholder: '365',
      group: 'credit',
      tab: 'general',
    },
    {
      name: 'initial_credits_description',
      title: 'Description',
      type: 'text',
      placeholder: 'Welcome bonus',
      group: 'credit',
      tab: 'general',
    },

    // ─── Auth / Email ────────────────────────────────────────────────
    {
      name: 'email_auth_enabled',
      title: 'Enable email auth',
      type: 'switch',
      group: 'email_auth',
      tab: 'auth',
      defaultValue: 'true',
    },
    {
      name: 'email_verification_enabled',
      title: 'Require email verification on sign up',
      type: 'switch',
      group: 'email_auth',
      tab: 'auth',
      defaultValue: 'false',
    },
    {
      name: 'invite_code_required',
      title: 'Require invite code on sign up',
      type: 'switch',
      group: 'email_auth',
      tab: 'auth',
      defaultValue: 'false',
    },
    {
      name: 'desktop_auth_schemes',
      title: 'Desktop hand-off schemes',
      type: 'text',
      placeholder: 'myapp,myapp-dev',
      group: 'email_auth',
      tab: 'auth',
    },

    // ─── Auth / Google ───────────────────────────────────────────────
    {
      name: 'google_auth_enabled',
      title: 'Enable Google auth',
      type: 'switch',
      group: 'google_auth',
      tab: 'auth',
    },
    {
      name: 'google_one_tap_enabled',
      title: 'Enable Google One Tap',
      type: 'switch',
      group: 'google_auth',
      tab: 'auth',
      tip: 'Show the Google One Tap prompt to signed-out visitors. Requires Client ID.',
    },
    {
      name: 'google_client_id',
      title: 'Client ID',
      type: 'text',
      placeholder: 'xxx.apps.googleusercontent.com',
      group: 'google_auth',
      tab: 'auth',
    },
    {
      name: 'google_client_secret',
      title: 'Client Secret',
      type: 'password',
      placeholder: 'GOCSPX-xxx',
      group: 'google_auth',
      tab: 'auth',
    },

    // ─── Auth / GitHub ───────────────────────────────────────────────
    {
      name: 'github_auth_enabled',
      title: 'Enable GitHub auth',
      type: 'switch',
      group: 'github_auth',
      tab: 'auth',
    },
    {
      name: 'github_client_id',
      title: 'Client ID',
      type: 'text',
      placeholder: 'Ov23xxx',
      group: 'github_auth',
      tab: 'auth',
    },
    {
      name: 'github_client_secret',
      title: 'Client Secret',
      type: 'password',
      placeholder: 'xxx',
      group: 'github_auth',
      tab: 'auth',
    },

    // ─── Payment / Basic ─────────────────────────────────────────────
    {
      name: 'select_payment_enabled',
      title: 'Show payment method selector',
      type: 'switch',
      group: 'basic_payment',
      tab: 'payment',
    },
    {
      name: 'default_payment_provider',
      title: 'Default provider',
      type: 'select',
      options: [
        { label: 'Stripe', value: 'stripe' },
        { label: 'Creem', value: 'creem' },
        { label: 'Waffo Pancake', value: 'waffo' },
        { label: 'Dodo Payments', value: 'dodo' },
        { label: 'PayPal', value: 'paypal' },
        { label: 'Alipay', value: 'alipay' },
        { label: 'WeChat Pay', value: 'wechat' },
      ],
      group: 'basic_payment',
      tab: 'payment',
    },

    // ─── Payment / Stripe ────────────────────────────────────────────
    {
      name: 'stripe_enabled',
      title: 'Enable Stripe',
      type: 'switch',
      group: 'stripe',
      tab: 'payment',
    },
    {
      name: 'stripe_publishable_key',
      title: 'Publishable Key',
      type: 'text',
      placeholder: 'pk_xxx',
      group: 'stripe',
      tab: 'payment',
    },
    {
      name: 'stripe_secret_key',
      title: 'Secret Key',
      type: 'password',
      placeholder: 'sk_xxx',
      group: 'stripe',
      tab: 'payment',
    },
    {
      name: 'stripe_signing_secret',
      title: 'Webhook Signing Secret',
      type: 'password',
      placeholder: 'whsec_xxx',
      group: 'stripe',
      tab: 'payment',
    },
    {
      name: 'stripe_price_ids_mapping',
      title: 'Price IDs Mapping (subscriptions)',
      type: 'textarea',
      placeholder:
        '{\n  "lite_monthly": "price_lite_monthly",\n  "pro_monthly": "price_pro_monthly",\n  "ultra_monthly": "price_ultra_monthly",\n  "lite_yearly": "price_lite_yearly",\n  "pro_yearly": "price_pro_yearly",\n  "ultra_yearly": "price_ultra_yearly"\n}',
      tip: 'Optional. Map /pricing subscription product_id to a fixed Stripe Price ID (price_…). Needed for in-place upgrades and end-of-period downgrades; unmapped plans use an inline price and can only be changed via a new checkout. Must be valid JSON.',
      group: 'stripe',
      tab: 'payment',
    },

    // ─── Payment / Creem ─────────────────────────────────────────────
    {
      name: 'creem_enabled',
      title: 'Enable Creem',
      type: 'switch',
      group: 'creem',
      tab: 'payment',
    },
    {
      name: 'creem_environment',
      title: 'Environment',
      type: 'select',
      options: [
        { label: 'Sandbox', value: 'sandbox' },
        { label: 'Production', value: 'production' },
      ],
      group: 'creem',
      tab: 'payment',
      defaultValue: 'sandbox',
    },
    {
      name: 'creem_api_key',
      title: 'API Key',
      type: 'password',
      placeholder: 'creem_xxx',
      group: 'creem',
      tab: 'payment',
    },
    {
      name: 'creem_signing_secret',
      title: 'Signing Secret',
      type: 'password',
      placeholder: 'whsec_xxx',
      group: 'creem',
      tab: 'payment',
    },
    {
      name: 'creem_product_ids_mapping',
      title: 'Product IDs Mapping',
      type: 'textarea',
      placeholder:
        '{\n  "lite_monthly": "prod_lite_monthly",\n  "pro_monthly": "prod_pro_monthly",\n  "ultra_monthly": "prod_ultra_monthly",\n  "lite_yearly": "prod_lite_yearly",\n  "pro_yearly": "prod_pro_yearly",\n  "ultra_yearly": "prod_ultra_yearly",\n  "credits_lite": "prod_credits_lite",\n  "credits_pro": "prod_credits_pro",\n  "credits_ultra": "prod_credits_ultra"\n}',
      tip: 'Map /pricing product_id (subscriptions + credits_lite / credits_pro / credits_ultra) to the Creem product ID. Must be a valid JSON object.',
      group: 'creem',
      tab: 'payment',
    },
    {
      name: 'creem_test_amount',
      title: 'Test amount (cents)',
      type: 'number',
      placeholder: 'Leave empty for real amount; set 1 to charge $0.01',
      group: 'creem',
      tab: 'payment',
    },

    // ─── Payment / Waffo Pancake ─────────────────────────────────────
    {
      name: 'waffo_enabled',
      title: 'Enable Waffo Pancake',
      type: 'switch',
      group: 'waffo',
      tab: 'payment',
    },
    {
      name: 'waffo_environment',
      title: 'Environment',
      type: 'select',
      options: [
        { label: 'Test', value: 'test' },
        { label: 'Production', value: 'prod' },
      ],
      tip: 'Must match the Waffo key mode. Webhooks from the other mode are ignored; test mode adds ?test=true to plan-change links.',
      group: 'waffo',
      tab: 'payment',
    },
    {
      name: 'waffo_merchant_id',
      title: 'Merchant ID',
      type: 'text',
      placeholder: 'MER_xxx',
      group: 'waffo',
      tab: 'payment',
    },
    {
      name: 'waffo_private_key',
      title: 'Private Key',
      type: 'password',
      placeholder: '-----BEGIN PRIVATE KEY-----',
      group: 'waffo',
      tab: 'payment',
    },
    {
      name: 'waffo_product_ids_mapping',
      title: 'Product IDs Mapping',
      type: 'textarea',
      placeholder:
        '{\n  "lite_monthly": "PROD_lite_monthly",\n  "pro_monthly": "PROD_pro_monthly",\n  "ultra_monthly": "PROD_ultra_monthly",\n  "lite_yearly": "PROD_lite_yearly",\n  "pro_yearly": "PROD_pro_yearly",\n  "ultra_yearly": "PROD_ultra_yearly",\n  "credits_lite": "PROD_credits_lite",\n  "credits_pro": "PROD_credits_pro",\n  "credits_ultra": "PROD_credits_ultra"\n}',
      tip: 'Map /pricing product_id (subscriptions + credits_lite / credits_pro / credits_ultra) to Waffo product IDs. Must be valid JSON.',
      group: 'waffo',
      tab: 'payment',
    },

    // ─── Payment / Dodo Payments ─────────────────────────────────────
    {
      name: 'dodo_enabled',
      title: 'Enable Dodo Payments',
      type: 'switch',
      group: 'dodo',
      tab: 'payment',
    },
    {
      name: 'dodo_environment',
      title: 'Environment',
      type: 'select',
      options: [
        { label: 'Test Mode', value: 'test_mode' },
        { label: 'Live Mode', value: 'live_mode' },
      ],
      tip: 'Must match the dashboard mode where the API key was created. Keys are not distinguishable by prefix.',
      group: 'dodo',
      tab: 'payment',
    },
    {
      name: 'dodo_api_key',
      title: 'API Key',
      type: 'password',
      placeholder: 'API key from Dodo dashboard (Developer → API Keys)',
      group: 'dodo',
      tab: 'payment',
    },
    {
      name: 'dodo_webhook_key',
      title: 'Webhook Secret',
      type: 'password',
      placeholder: 'whsec_...',
      group: 'dodo',
      tab: 'payment',
    },
    {
      name: 'dodo_product_ids_mapping',
      title: 'Product IDs Mapping',
      type: 'textarea',
      placeholder:
        '{\\n  "lite_monthly": "pdt_lite_monthly",\\n  "pro_monthly": "pdt_pro_monthly",\\n  "ultra_monthly": "pdt_ultra_monthly",\\n  "lite_yearly": "pdt_lite_yearly",\\n  "pro_yearly": "pdt_pro_yearly",\\n  "ultra_yearly": "pdt_ultra_yearly",\\n  "credits_lite": "pdt_credits_lite",\\n  "credits_pro": "pdt_credits_pro",\\n  "credits_ultra": "pdt_credits_ultra"\\n}',
      tip: 'Map /pricing product_id (subscriptions + credits_lite / credits_pro / credits_ultra) to Dodo Payments product IDs. Use “Fill template” in Admin → Settings for a full JSON skeleton. Must be valid JSON.',
      group: 'dodo',
      tab: 'payment',
    },
    {
      name: 'dodo_test_amount',
      title: 'Test amount (cents)',
      type: 'number',
      placeholder: 'Leave empty for real amount; set 1 to charge $0.01',
      group: 'dodo',
      tab: 'payment',
    },

    // ─── Payment / PayPal ────────────────────────────────────────────
    {
      name: 'paypal_enabled',
      title: 'Enable PayPal',
      type: 'switch',
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'paypal_client_id',
      title: 'Client ID',
      type: 'text',
      placeholder: 'xxx',
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'paypal_client_secret',
      title: 'Client Secret',
      type: 'password',
      placeholder: 'xxx',
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'paypal_webhook_id',
      title: 'Webhook ID',
      type: 'text',
      placeholder: 'xxx',
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'paypal_environment',
      title: 'Environment',
      type: 'select',
      options: [
        { label: 'Sandbox', value: 'sandbox' },
        { label: 'Live', value: 'live' },
      ],
      group: 'paypal',
      tab: 'payment',
    },
    {
      name: 'paypal_test_amount',
      title: 'Test amount (cents)',
      type: 'number',
      placeholder: 'Leave empty for real amount; set 1 to charge $0.01',
      group: 'paypal',
      tab: 'payment',
    },

    // ─── Payment / Alipay ─────────────────────────────────────────────
    {
      name: 'alipay_enabled',
      title: 'Enable Alipay',
      type: 'switch',
      group: 'alipay',
      tab: 'payment',
    },
    {
      name: 'alipay_app_id',
      title: 'App ID',
      type: 'text',
      placeholder: '2021xxx',
      group: 'alipay',
      tab: 'payment',
    },
    {
      name: 'alipay_private_key',
      title: 'Private Key (RSA2)',
      type: 'textarea',
      placeholder: 'MIIEvQIBADANBgkq...',
      group: 'alipay',
      tab: 'payment',
    },
    {
      name: 'alipay_public_key',
      title: 'Alipay Public Key',
      type: 'textarea',
      placeholder: 'MIIBIjANBgkq...',
      group: 'alipay',
      tab: 'payment',
    },
    {
      name: 'alipay_notify_url',
      title: 'Notify URL (Webhook)',
      type: 'text',
      placeholder: 'https://hersoul.cn/api/payment/notify/alipay',
      group: 'alipay',
      tab: 'payment',
    },
    {
      name: 'alipay_test_amount',
      title: 'Test amount (分)',
      type: 'number',
      placeholder: 'Leave empty for real amount; set 1 to charge ¥0.01',
      group: 'alipay',
      tab: 'payment',
    },

    // ─── Payment / WeChat Pay ───────────────────────────────────────
    {
      name: 'wechat_enabled',
      title: 'Enable WeChat Pay',
      type: 'switch',
      group: 'wechat',
      tab: 'payment',
    },
    {
      name: 'wechat_app_id',
      title: 'AppID',
      type: 'text',
      placeholder: 'wx1234567890',
      group: 'wechat',
      tab: 'payment',
    },
    {
      name: 'wechat_mch_id',
      title: 'Merchant ID (商户号)',
      type: 'text',
      placeholder: '1900000001',
      group: 'wechat',
      tab: 'payment',
    },
    {
      name: 'wechat_api_v3_key',
      title: 'APIv3 Key (32位密钥)',
      type: 'password',
      placeholder: '32 chars',
      group: 'wechat',
      tab: 'payment',
    },
    {
      name: 'wechat_private_key',
      title: 'Merchant Private Key (PEM)',
      type: 'textarea',
      placeholder: 'MIIEvgIBADANBgkq...',
      group: 'wechat',
      tab: 'payment',
    },
    {
      name: 'wechat_serial_no',
      title: 'Certificate Serial No',
      type: 'text',
      placeholder: 'xxx',
      group: 'wechat',
      tab: 'payment',
    },
    {
      name: 'wechat_notify_url',
      title: 'Notify URL (Webhook)',
      type: 'text',
      placeholder: 'https://hersoul.cn/api/payment/notify/wechat',
      group: 'wechat',
      tab: 'payment',
    },
    {
      name: 'wechat_test_amount',
      title: 'Test amount (分)',
      type: 'number',
      placeholder: 'Leave empty for real amount; set 1 to charge ¥0.01',
      group: 'wechat',
      tab: 'payment',
    },

    // ─── Email / General ────────────────────────────────────────────
    {
      name: 'email_provider',
      title: 'Email Provider',
      type: 'select',
      options: [
        { label: 'Resend', value: 'resend' },
        { label: 'Cloudflare Email', value: 'cloudflare' },
      ],
      group: 'email_general',
      tab: 'email',
      defaultValue: 'resend',
    },

    // ─── Email / Resend ──────────────────────────────────────────────
    {
      name: 'resend_api_key',
      title: 'API Key',
      type: 'password',
      placeholder: 're_xxx',
      group: 'resend',
      tab: 'email',
    },
    {
      name: 'resend_sender_email',
      title: 'Sender Email',
      type: 'text',
      placeholder: 'hello@example.com',
      group: 'resend',
      tab: 'email',
    },

    // ─── Email / Cloudflare Email ────────────────────────────────────
    {
      name: 'cloudflare_email_api_token',
      title: 'API Token',
      type: 'password',
      placeholder: 'Bearer token with Email Send permission',
      group: 'cloudflare_email',
      tab: 'email',
    },
    {
      name: 'cloudflare_email_account_id',
      title: 'Account ID',
      type: 'text',
      placeholder: 'Cloudflare account ID',
      group: 'cloudflare_email',
      tab: 'email',
    },
    {
      name: 'cloudflare_email_sender_email',
      title: 'Sender Email',
      type: 'text',
      placeholder: 'hello@yourdomain.com',
      group: 'cloudflare_email',
      tab: 'email',
    },

    // ─── Storage / R2 ────────────────────────────────────────────────
    // Keys mirror the original ShipAny Two (`r2_*`) so existing DB config is read as-is.
    {
      name: 'r2_access_key',
      title: 'Cloudflare Access Key',
      type: 'text',
      placeholder: '',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_secret_key',
      title: 'Cloudflare Secret Key',
      type: 'password',
      placeholder: '',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_bucket_name',
      title: 'Bucket Name',
      type: 'text',
      placeholder: '',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_upload_path',
      title: 'Upload Path',
      type: 'text',
      placeholder: 'uploads',
      tip: 'Path to upload files to; leave empty to use the default. Example: uploads/foo/bar',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_endpoint',
      title: 'Endpoint',
      type: 'text',
      placeholder: 'https://<account-id>.r2.cloudflarestorage.com',
      tip: 'Leave empty to use the default R2 endpoint',
      group: 'r2',
      tab: 'storage',
    },
    {
      name: 'r2_domain',
      title: 'Domain',
      type: 'text',
      placeholder: 'https://cdn.example.com',
      group: 'r2',
      tab: 'storage',
    },

    // ─── AI / APIMart ────────────────────────────────────────────────
    {
      name: 'apimart_base_url',
      title: 'Base URL',
      type: 'text',
      placeholder: 'https://api.apimart.ai/v1',
      group: 'apimart',
      tab: 'ai',
      defaultValue: 'https://api.apimart.ai/v1',
    },
    {
      name: 'apimart_api_key',
      title: 'API Key',
      type: 'password',
      placeholder: 'sk-xxx',
      group: 'apimart',
      tab: 'ai',
    },

    // ─── AI / KIE ────────────────────────────────────────────────────
    {
      name: 'kie_base_url',
      title: 'Base URL',
      type: 'text',
      placeholder: 'https://api.kie.ai/api/v1',
      group: 'kie',
      tab: 'ai',
      defaultValue: 'https://api.kie.ai/api/v1',
    },
    {
      name: 'kie_api_key',
      title: 'API Key',
      type: 'password',
      placeholder: 'xxx',
      group: 'kie',
      tab: 'ai',
    },

    // ─── AI / Alibaba Cloud Model Studio ──────────────────────────────
    {
      name: 'alibaba_base_url',
      title: 'Base URL',
      type: 'text',
      placeholder: 'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com/compatible-mode/v1',
      group: 'alibaba',
      tab: 'ai',
      defaultValue: 'https://ws-2txa9apyfxruykae.us-east-1.maas.aliyuncs.com/compatible-mode/v1',
      tip: 'Alibaba Cloud Model Studio International Maas Endpoint',
    },
    {
      name: 'alibaba_api_key',
      title: 'API Key',
      type: 'password',
      placeholder: 'sk-ws-xxx',
      group: 'alibaba',
      tab: 'ai',
      tip: 'Model Studio API Key (for HappyHorse 1.1 video generation & DeepSeek lyrics)',
    },
    {
      name: 'alibaba_model',
      title: 'Lyrics Model (作词大模型)',
      type: 'text',
      placeholder: 'deepseek-v4.1-flash-1017',
      defaultValue: 'deepseek-v4.1-flash-1017',
      group: 'alibaba',
      tab: 'ai',
      tip: 'DeepSeek LLM model used for multi-syllable rap lyrics',
    },
    {
      name: 'alibaba_video_model',
      title: 'Video Model (生视频模型)',
      type: 'select',
      options: [
        { label: 'Wan 2.1 Image-to-Video Plus (万象高品质图生视频·推荐)', value: 'wan2.1-i2v-plus' },
        { label: 'Wanx v1 (经典版图生视频)', value: 'wanx-v1' },
        { label: 'HappyHorse 1.1 R2V (阿里音画动作驱动)', value: 'happyhorse-1.1-r2v' },
        { label: 'Wan 2.1 Text-to-Video Plus (万象文生视频)', value: 'wan2.1-t2v-plus' },
      ],
      group: 'alibaba',
      tab: 'ai',
      defaultValue: 'wan2.1-i2v-plus',
      tip: '阿里百炼生视频模型。Wan 2.1 是阿里官方最新一代视频生成大模型，各地域全量支持。',
    },
    {
      name: 'alibaba_video_resolution',
      title: 'Default Resolution (默认视频分辨率)',
      type: 'select',
      options: [
        { label: '480P (经济快速·推荐调试)', value: '480p' },
        { label: '720P (高清成片)', value: '720p' },
        { label: '1080P (超清影院级)', value: '1080p' },
      ],
      group: 'alibaba',
      tab: 'ai',
      defaultValue: '480p',
      tip: '默认生成分辨率，更高分辨率将提供更清晰细节。',
    },
    {
      name: 'alibaba_video_duration',
      title: 'Default Duration (默认视频时长)',
      type: 'select',
      options: [
        { label: '5 秒 (标准短视频节拍片段)', value: '5' },
        { label: '10 秒 (长镜头说唱展示)', value: '10' },
      ],
      group: 'alibaba',
      tab: 'ai',
      defaultValue: '5',
      tip: '视频生成的单次片段时长（秒）。',
    },

    // ─── Analytics / Google Analytics ────────────────────────────────
    {
      name: 'google_analytics_id',
      title: 'Measurement ID',
      type: 'text',
      placeholder: 'G-XXXXXXXXXX',
      group: 'google_analytics',
      tab: 'analytics',
    },

    // ─── Analytics / Plausible ───────────────────────────────────────
    {
      name: 'plausible_domain',
      title: 'Domain',
      type: 'text',
      placeholder: 'example.com',
      tip: 'Optional for the new site-specific script; required by legacy scripts',
      group: 'plausible',
      tab: 'analytics',
    },
    {
      name: 'plausible_src',
      title: 'Script Src',
      type: 'text',
      placeholder: 'https://plausible.example.com/js/pa-XXXXX.js',
      tip: 'Paste the complete site-specific script URL from Plausible, or leave blank to use the legacy cloud script. Accepts a same-site proxy path (e.g. /js/script.js) or an https URL on plausible.io; a self-hosted domain must be listed in the server env PLAUSIBLE_SCRIPT_HOSTS (restart or redeploy, no rebuild)',
      group: 'plausible',
      tab: 'analytics',
    },

    // ─── Analytics / Cookie Consent ──────────────────────────────────
    {
      name: 'cookie_consent_enabled',
      title: 'Enable Cookie Banner',
      type: 'switch',
      tip: 'Recommended if you serve visitors in the EU/UK and use Google Analytics or AdSense',
      group: 'cookie_consent',
      tab: 'analytics',
    },

    // ─── Ads / Google AdSense ────────────────────────────────────────
    {
      name: 'adsense_code',
      title: 'Publisher ID',
      type: 'text',
      placeholder: 'ca-pub-XXXXXXXXXXXXXXXX',
      tip: 'Your AdSense publisher ID — also used to generate /ads.txt',
      group: 'adsense',
      tab: 'ads',
    },

    // ─── Customer Service / Crisp ───────────────────────────────────
    {
      name: 'crisp_enabled',
      title: 'Enable Crisp',
      type: 'switch',
      group: 'crisp',
      tab: 'customer_service',
    },
    {
      name: 'crisp_website_id',
      title: 'Website ID',
      type: 'text',
      placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      group: 'crisp',
      tab: 'customer_service',
    },

    // ─── Customer Service / Tawk.to ─────────────────────────────────
    {
      name: 'tawk_enabled',
      title: 'Enable Tawk.to',
      type: 'switch',
      group: 'tawk',
      tab: 'customer_service',
    },
    {
      name: 'tawk_property_id',
      title: 'Property ID',
      type: 'text',
      placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxx',
      group: 'tawk',
      tab: 'customer_service',
    },
    {
      name: 'tawk_widget_id',
      title: 'Widget ID',
      type: 'text',
      placeholder: '1xxxxx/default',
      group: 'tawk',
      tab: 'customer_service',
    },

    // ─── Notify / Settings (events + shared message options) ─────────
    {
      name: 'notify_payment_enabled',
      title: 'Successful payment',
      type: 'switch',
      group: 'notify_settings',
      tab: 'notify',
      defaultValue: 'false',
    },
    {
      name: 'notify_ticket_enabled',
      title: 'Tickets',
      type: 'switch',
      group: 'notify_settings',
      tab: 'notify',
      defaultValue: 'false',
    },
    {
      name: 'notify_language',
      title: 'Message language',
      type: 'select',
      options: [
        { label: '中文', value: 'zh' },
        { label: 'English', value: 'en' },
      ],
      group: 'notify_settings',
      tab: 'notify',
      defaultValue: 'zh',
    },
    {
      name: 'notify_timezone',
      title: 'Time zone',
      type: 'text',
      placeholder: 'Asia/Shanghai',
      group: 'notify_settings',
      tab: 'notify',
    },

    // ─── Notify / Telegram ───────────────────────────────────────────
    {
      name: 'telegram_bot_token',
      title: 'Bot Token',
      type: 'password',
      placeholder: '123456789:AAxxxxxxxx',
      group: 'notify_telegram',
      tab: 'notify',
    },
    {
      name: 'telegram_chat_id',
      title: 'Chat ID',
      type: 'text',
      placeholder: '-1001234567890',
      group: 'notify_telegram',
      tab: 'notify',
    },
    {
      name: 'telegram_api_base',
      title: 'API Base URL',
      type: 'text',
      placeholder: 'https://api.telegram.org',
      group: 'notify_telegram',
      tab: 'notify',
    },

    // ─── Notify / Feishu ─────────────────────────────────────────────
    {
      name: 'feishu_webhook_url',
      title: 'Webhook URL',
      type: 'password',
      placeholder: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
      group: 'notify_feishu',
      tab: 'notify',
    },
    {
      name: 'feishu_secret',
      title: 'Signing Secret',
      type: 'password',
      group: 'notify_feishu',
      tab: 'notify',
    },

    // ─── Notify / WeCom ──────────────────────────────────────────────
    {
      name: 'wecom_webhook_url',
      title: 'Webhook URL',
      type: 'password',
      placeholder: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx',
      group: 'notify_wecom',
      tab: 'notify',
    },

    // ─── Notify / Generic webhook ────────────────────────────────────
    {
      name: 'notify_webhook_url',
      title: 'Webhook URL',
      type: 'password',
      placeholder: 'https://example.com/hooks/xxx',
      group: 'notify_webhook',
      tab: 'notify',
    },
    {
      name: 'notify_webhook_token',
      title: 'Bearer Token',
      type: 'password',
      group: 'notify_webhook',
      tab: 'notify',
    },
  ];
}
