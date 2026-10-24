import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ChevronDown,
  ExternalLink,
  FlaskConical,
  Minus,
  Plus,
  Save,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

import { tDynamic } from '@/core/i18n/dynamic';
import { listPricingProducts } from '@/config/pricing';
import {
  getSettingGroups,
  getSettings,
  getSettingTabs,
  type Setting,
} from '@/modules/config/settings';
import { getTestSpec } from '@/modules/config/settings-test-specs';
import { apiGet, apiPost } from '@/lib/api-client';
import { apiErrorMessage } from '@/lib/api-error';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { SettingsTestDialog } from '@/components/admin/settings-test-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

/** Placeholder JSON keys = /pricing catalog productId (subscriptions + credit packs). */
function productIdsMappingPlaceholder(samplePrefix: string): string {
  return JSON.stringify(
    Object.fromEntries(
      listPricingProducts().map((product) => [
        product.productId,
        `${samplePrefix}${product.productId}`,
      ])
    ),
    null,
    2
  );
}

/**
 * Notice shown when an admin turns a switch ON.
 * - `block: true`  → info only, the switch stays off (provider not implemented).
 * - `block: false` → confirm dialog; Cancel keeps it off, Confirm turns it on.
 */
type SwitchEnableNotice = {
  title: () => string;
  desc: () => string;
  learnMoreUrl?: string;
  block: boolean;
};

function cnyOnlyNotice(provider: () => string): SwitchEnableNotice {
  return {
    title: () =>
      m['admin.settings.cny_only_notice.title']({ provider: provider() }),
    desc: () =>
      m['admin.settings.cny_only_notice.desc']({ provider: provider() }),
    block: false,
  };
}

const SWITCH_ENABLE_NOTICES: Record<string, SwitchEnableNotice> = {
  paypal_enabled: {
    title: () => m['admin.settings.paypal_notice.title'](),
    desc: () => m['admin.settings.paypal_notice.desc'](),
    learnMoreUrl: 'https://shipany.ai/zh/docs/shipany-tanstack/payment',
    block: true,
  },
  alipay_enabled: cnyOnlyNotice(() =>
    m['admin.settings.groups.alipay.title']()
  ),
  wechat_enabled: cnyOnlyNotice(() =>
    m['admin.settings.groups.wechat.title']()
  ),
};

function SettingsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-56" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AdminSettingsPage() {
  const placeholders: Record<string, string> = {
    creem_test_amount: m['admin.settings.placeholders.creem_test_amount'](),
    paypal_test_amount: m['admin.settings.placeholders.paypal_test_amount'](),
    alipay_test_amount: m['admin.settings.placeholders.alipay_test_amount'](),
    wechat_test_amount: m['admin.settings.placeholders.wechat_test_amount'](),
    creem_product_ids_mapping: productIdsMappingPlaceholder('prod_'),
    stripe_price_ids_mapping: productIdsMappingPlaceholder('price_'),
    waffo_product_ids_mapping: productIdsMappingPlaceholder('PROD_'),
    dodo_test_amount: m['admin.settings.placeholders.creem_test_amount'](),
    dodo_product_ids_mapping: productIdsMappingPlaceholder('pdt_'),
  };
  const queryClient = useQueryClient();
  const [configs, setConfigs] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('general');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [testingGroup, setTestingGroup] = useState<string | null>(null);
  const [customRows, setCustomRows] = useState<
    { key: string; value: string }[]
  >([]);

  function toggleCollapse(name: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const tabs = getSettingTabs();
  const groups = getSettingGroups();
  const settings = getSettings();

  const { data: loadedConfigs, isLoading } = useQuery({
    queryKey: ['admin-config'],
    queryFn: () => apiGet<Record<string, string>>('/api/admin/config'),
  });

  useEffect(() => {
    if (loadedConfigs) setConfigs(loadedConfigs);
  }, [loadedConfigs]);

  const { data: loadedCustom } = useQuery({
    queryKey: ['admin-config-custom'],
    queryFn: () =>
      apiGet<{ key: string; value: string }[]>('/api/admin/config/custom'),
  });

  useEffect(() => {
    if (loadedCustom) setCustomRows(loadedCustom);
  }, [loadedCustom]);

  function handleChange(name: string, value: string) {
    setConfigs((prev) => ({ ...prev, [name]: value }));
  }

  function addCustomRow() {
    setCustomRows((prev) => [...prev, { key: '', value: '' }]);
  }

  function removeCustomRow(index: number) {
    setCustomRows((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCustomRow(
    index: number,
    field: 'key' | 'value',
    value: string
  ) {
    setCustomRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  }

  const saveMutation = useMutation({
    mutationFn: (toSave: Record<string, string>) =>
      apiPost('/api/admin/config', toSave),
    onSuccess: () => {
      toast.success(m['admin.settings.save_success']());
      queryClient.invalidateQueries({ queryKey: ['admin-config'] });
      queryClient.invalidateQueries({ queryKey: ['public-config'] });
    },
    onError: (err: any) => {
      toast.error(apiErrorMessage(err, m['admin.settings.save_error']()));
    },
  });

  const customSaveMutation = useMutation({
    mutationFn: (rows: { key: string; value: string }[]) =>
      apiPost('/api/admin/config/custom', { configs: rows }),
    onSuccess: () => {
      toast.success(m['admin.settings.save_success']());
      queryClient.invalidateQueries({ queryKey: ['admin-config-custom'] });
      queryClient.invalidateQueries({ queryKey: ['public-config'] });
    },
    onError: (err: any) => {
      toast.error(apiErrorMessage(err, m['admin.settings.save_error']()));
    },
  });

  const saving = saveMutation.isPending || customSaveMutation.isPending;

  function handleSave() {
    if (activeTab === 'custom') {
      const rows = customRows
        .map((r) => ({ key: r.key.trim(), value: r.value }))
        .filter((r) => r.key);
      customSaveMutation.mutate(rows);
      return;
    }
    const tabSettings = settings.filter((s) => s.tab === activeTab);
    const toSave: Record<string, string> = {};
    for (const s of tabSettings) {
      if (configs[s.name] !== undefined) {
        toSave[s.name] = configs[s.name];
      }
    }
    saveMutation.mutate(toSave);
  }

  const tabGroups = groups.filter(
    (g) => g.tab === activeTab && g.name !== 'paypal'
  );
  const tabSettings = settings.filter(
    (s) => s.tab === activeTab && s.group !== 'paypal'
  );

  return (
    <div className="w-full max-w-7xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{m['admin.settings.title']()}</h1>
          <p className="text-muted-foreground">
            {m['admin.settings.description']()}
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="size-4" />
          {saving ? m['admin.settings.saving']() : m['admin.settings.save']()}
        </Button>
      </div>

      {/* Tabs */}
      <div className="border-border flex gap-1 overflow-x-auto overflow-y-hidden border-b">
        {tabs.map((tab) => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab.name)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors',
              activeTab === tab.name
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            {tDynamic(`admin.settings.tabs.${tab.name}`)}
          </button>
        ))}
      </div>

      {/* AI Tab Provider Priority Notice */}
      {activeTab === 'ai' && !isLoading && (
        <div className="border-primary/20 bg-primary/5 text-foreground flex items-start gap-3 rounded-2xl border p-4 shadow-2xs">
          <Sparkles className="text-primary mt-0.5 size-5 shrink-0" />
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="text-foreground font-semibold">
              {m['admin.settings.ai_priority_title']()}
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {m['admin.settings.ai_priority_desc']()}
            </p>
          </div>
        </div>
      )}

      {/* Groups */}
      {isLoading ? (
        <SettingsSkeleton />
      ) : activeTab === 'custom' ? (
        <Card className="max-w-4xl">
          <CardHeader>
            <CardTitle>{m['admin.settings.custom.title']()}</CardTitle>
            <p className="text-muted-foreground text-sm">
              {m['admin.settings.custom.description']()}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {customRows.length === 0 && (
              <p className="text-muted-foreground text-sm">
                {m['admin.settings.custom.empty']()}
              </p>
            )}
            {customRows.map((row, i) => (
              <div key={i} className="flex items-start gap-2">
                <Input
                  value={row.key}
                  onChange={(e) => updateCustomRow(i, 'key', e.target.value)}
                  placeholder={m['admin.settings.custom.key_placeholder']()}
                  className="w-1/3 shrink-0 font-mono"
                />
                <textarea
                  value={row.value}
                  onChange={(e) => updateCustomRow(i, 'value', e.target.value)}
                  placeholder={m['admin.settings.custom.value_placeholder']()}
                  rows={1}
                  className="border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex h-8 max-h-48 min-h-8 flex-1 resize-y rounded-lg border bg-transparent px-2.5 py-1 text-base leading-6 transition-colors outline-none focus-visible:ring-3 md:text-sm"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => removeCustomRow(i)}
                  aria-label={m['admin.settings.custom.remove']()}
                >
                  <Minus className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              onClick={addCustomRow}
              className="gap-1.5"
            >
              <Plus className="size-4" />
              {m['admin.settings.custom.add']()}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {tabGroups.map((group) => {
            const groupSettings = tabSettings.filter(
              (s) => s.group === group.name
            );
            if (groupSettings.length === 0) return null;

            const testSpec = getTestSpec(group.name);
            return (
              <Card key={group.name} className="flex h-full flex-col">
                <CardHeader
                  className="cursor-pointer"
                  onClick={() => toggleCollapse(group.name)}
                >
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {group.link ? (
                        <a
                          href={group.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="group/link text-foreground hover:text-primary inline-flex items-center gap-1.5 transition-colors hover:underline"
                        >
                          <span>
                            {tDynamic(
                              `admin.settings.groups.${group.name}.title`,
                              group.title
                            )}
                          </span>
                          <ExternalLink className="text-muted-foreground group-hover/link:text-primary size-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
                        </a>
                      ) : (
                        tDynamic(
                          `admin.settings.groups.${group.name}.title`,
                          group.title
                        )
                      )}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      {testSpec && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            setTestingGroup(group.name);
                          }}
                        >
                          <FlaskConical className="size-3.5" />
                          {m['admin.settings.test.button']()}
                        </Button>
                      )}
                      <ChevronDown
                        className={`text-muted-foreground size-5 transition-transform ${
                          collapsed.has(group.name) ? '-rotate-90' : ''
                        }`}
                      />
                    </div>
                  </div>
                </CardHeader>
                {!collapsed.has(group.name) && (
                  <CardContent className="flex-1 space-y-4">
                    {groupSettings.map((setting) => (
                      <SettingField
                        key={setting.name}
                        setting={setting}
                        label={tDynamic(
                          `admin.settings.fields.${setting.name}`,
                          setting.title
                        )}
                        placeholder={
                          placeholders[setting.name] ??
                          tDynamic(
                            `admin.settings.placeholders.${setting.name}`,
                            setting.placeholder ?? ''
                          )
                        }
                        value={
                          configs[setting.name] ?? setting.defaultValue ?? ''
                        }
                        onChange={(v) => handleChange(setting.name, v)}
                      />
                    ))}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {testingGroup && getTestSpec(testingGroup) && (
        <SettingsTestDialog
          open={!!testingGroup}
          onOpenChange={(open) => !open && setTestingGroup(null)}
          group={testingGroup}
          spec={getTestSpec(testingGroup)!}
          groupTitle={tDynamic(
            `admin.settings.groups.${testingGroup}.title`,
            testingGroup
          )}
          configOverrides={Object.fromEntries(
            settings
              .filter(
                (s) => s.group === testingGroup && configs[s.name] !== undefined
              )
              .map((s) => [s.name, configs[s.name]])
          )}
        />
      )}
    </div>
  );
}

function SettingField({
  setting,
  label,
  placeholder,
  value,
  onChange,
}: {
  setting: Setting;
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [enableNoticeOpen, setEnableNoticeOpen] = useState(false);

  if (setting.type === 'switch') {
    const enableNotice = SWITCH_ENABLE_NOTICES[setting.name];
    return (
      <div className="space-y-2">
        <Label htmlFor={setting.name}>{label}</Label>
        <div>
          <Switch
            id={setting.name}
            checked={value === 'true'}
            onCheckedChange={(checked) => {
              // Some providers need a notice before enabling (see
              // SWITCH_ENABLE_NOTICES); turning a switch off never prompts.
              if (checked && enableNotice) {
                setEnableNoticeOpen(true);
                return;
              }
              onChange(checked ? 'true' : 'false');
            }}
          />
        </div>

        {enableNotice && (
          <Dialog open={enableNoticeOpen} onOpenChange={setEnableNoticeOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{enableNotice.title()}</DialogTitle>
                <DialogDescription>
                  {enableNotice.desc()}
                  {enableNotice.learnMoreUrl && (
                    <>
                      {' '}
                      <a
                        href={enableNotice.learnMoreUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary font-medium hover:underline"
                      >
                        {m['admin.settings.paypal_notice.learn_more']()}
                      </a>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-end gap-2 pt-2">
                {enableNotice.block ? (
                  <Button
                    type="button"
                    onClick={() => setEnableNoticeOpen(false)}
                  >
                    {m['admin.settings.paypal_notice.ok']()}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEnableNoticeOpen(false)}
                    >
                      {m['admin.settings.cny_only_notice.cancel']()}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        onChange('true');
                        setEnableNoticeOpen(false);
                      }}
                    >
                      {m['admin.settings.cny_only_notice.confirm']()}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  if (setting.type === 'select' && setting.options) {
    const options =
      setting.name === 'default_payment_provider'
        ? setting.options.filter((opt) => opt.value !== 'paypal')
        : setting.options;

    return (
      <div className="space-y-2">
        <Label htmlFor={setting.name}>{label}</Label>
        <Select value={value} onValueChange={(v) => onChange(v || '')}>
          <SelectTrigger>
            <SelectValue
              placeholder={
                placeholder || m['common.action.select_placeholder']()
              }
            />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {tDynamic(
                  `admin.settings.options.${setting.name}.${opt.value}`,
                  opt.label
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (setting.type === 'textarea') {
    const isProductMapping =
      setting.name === 'creem_product_ids_mapping' ||
      setting.name === 'stripe_price_ids_mapping' ||
      setting.name === 'waffo_product_ids_mapping' ||
      setting.name === 'dodo_product_ids_mapping';
    const isTopBannerItems = setting.name === 'top_banner_items';
    const hasFillTemplate = isProductMapping || isTopBannerItems;
    const fillDialogTitle = isTopBannerItems
      ? m['admin.settings.top_banner.fill_template.dialog_title']()
      : m['admin.settings.product_mapping.dialog_title']();
    const fillDialogDesc = isTopBannerItems
      ? m['admin.settings.top_banner.fill_template.dialog_desc']()
      : m['admin.settings.product_mapping.dialog_desc']();
    const fillSuccess = isTopBannerItems
      ? m['admin.settings.top_banner.fill_template.filled_success']()
      : m['admin.settings.product_mapping.filled_success']();
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor={setting.name}>{label}</Label>
          {hasFillTemplate && (
            <button
              type="button"
              onClick={() => setConfirmDialogOpen(true)}
              className="text-primary cursor-pointer text-xs font-medium transition-colors hover:underline"
            >
              {m['admin.settings.product_mapping.fill_template']()}
            </button>
          )}
        </div>
        <textarea
          id={setting.name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={isProductMapping || isTopBannerItems ? 12 : 3}
          className={cn(
            'border-input placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none',
            hasFillTemplate && 'font-mono'
          )}
        />

        {hasFillTemplate && (
          <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{fillDialogTitle}</DialogTitle>
                <DialogDescription>{fillDialogDesc}</DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDialogOpen(false)}
                >
                  {m['admin.settings.product_mapping.dialog_cancel']()}
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    onChange(placeholder || '');
                    setConfirmDialogOpen(false);
                    toast.success(fillSuccess);
                  }}
                >
                  {m['admin.settings.product_mapping.dialog_confirm']()}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={setting.name}>{label}</Label>
      <Input
        id={setting.name}
        type={
          setting.type === 'password'
            ? 'password'
            : setting.type === 'number'
              ? 'number'
              : 'text'
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

export const Route = createFileRoute('/admin/settings')({
  component: AdminSettingsPage,
});
