import { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';

import type {
  TestField,
  TestResult,
  TestSpec,
} from '@/modules/config/settings-test-specs';
import { apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { Button } from '@/components/ui/button';
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

export interface SettingsTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: string;
  groupTitle: string;
  spec: TestSpec;
  configOverrides?: Record<string, string>;
}

export function SettingsTestDialog({
  open,
  onOpenChange,
  group,
  groupTitle,
  spec,
  configOverrides,
}: SettingsTestDialogProps) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [result, setResult] = useState<TestResult | null>(null);

  const testMutation = useMutation({
    mutationFn: () =>
      apiPost<TestResult>('/api/admin/settings/test', {
        group,
        inputs,
        configs: configOverrides ?? {},
      }),
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (err: any) => {
      setResult({
        success: false,
        message: err?.message || m['admin.settings.test.error'](),
      });
    },
  });
  const running = testMutation.isPending;

  // Reset form + result each time the dialog opens for a new group
  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    for (const f of spec.fields) {
      if (f.defaultValue) initial[f.name] = f.defaultValue;
    }
    setInputs(initial);
    setResult(null);
    testMutation.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, group, spec]);

  const canRun = useMemo(
    () => spec.fields.every((f) => !f.required || !!inputs[f.name]?.trim()),
    [spec.fields, inputs]
  );

  function handleRun() {
    setResult(null);
    testMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {m['admin.settings.test.title']({ group: groupTitle })}
          </DialogTitle>
          <DialogDescription>
            {m['admin.settings.test.description']()}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid min-w-0 gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleRun();
          }}
        >
          <div className="space-y-3">
            {spec.fields.map((field) => (
              <TestInput
                key={field.name}
                field={field}
                value={inputs[field.name] ?? ''}
                onChange={(v) =>
                  setInputs((prev) => ({ ...prev, [field.name]: v }))
                }
              />
            ))}
          </div>

          {result && <TestResultView result={result} />}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={running}
            >
              {m['admin.settings.test.close']()}
            </Button>
            <Button type="submit" disabled={running || !canRun}>
              {running && <Loader2 className="size-4 animate-spin" />}
              {running
                ? m['admin.settings.test.running']()
                : m['admin.settings.test.run']()}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TestInput({
  field,
  value,
  onChange,
}: {
  field: TestField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={field.name}>
        {(field.labelKey &&
          (m as unknown as Record<string, (() => string) | undefined>)[
            field.labelKey
          ]?.()) ||
          field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {field.type === 'textarea' ? (
        <textarea
          id={field.name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="border-input placeholder:text-muted-foreground focus-visible:ring-ring flex w-full rounded-md border bg-transparent px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
        />
      ) : (
        <Input
          id={field.name}
          type={
            field.type === 'number'
              ? 'number'
              : field.type === 'email'
                ? 'email'
                : 'text'
          }
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
        />
      )}
    </div>
  );
}

// The test runner answers in English (it is shared with the admin API);
// map its known messages and detail labels to the active locale here.
// Unknown text (raw provider errors) passes through unchanged.
const DETAIL_LABEL_MESSAGES: Record<string, () => string> = {
  'Message ID': m['admin.settings.test.details.message_id'],
  'Session ID': m['admin.settings.test.details.session_id'],
  'Checkout URL': m['admin.settings.test.details.checkout_url'],
  'Order ID': m['admin.settings.test.details.order_id'],
  'Approval URL': m['admin.settings.test.details.approval_url'],
  'Order No': m['admin.settings.test.details.order_no'],
  Key: m['admin.settings.test.details.key'],
  URL: m['admin.settings.test.details.url'],
  Location: m['admin.settings.test.details.location'],
  Model: m['admin.settings.test.details.model'],
  Reply: m['admin.settings.test.details.reply'],
  'Task ID': m['admin.settings.test.details.task_id'],
  Status: m['admin.settings.test.details.status'],
};

function localizeTestMessage(message: string): string {
  switch (message) {
    case 'Email sent successfully':
      return m['admin.settings.test.result.email_sent']();
    case 'Send failed':
      return m['admin.settings.test.result.send_failed']();
    case 'Checkout session created':
    case 'Checkout created':
      return m['admin.settings.test.result.checkout_created']();
    case 'Uploaded test object':
      return m['admin.settings.test.result.upload_ok']();
    case 'Upload failed':
      return m['errors.upload_failed']();
    case 'Test failed with unknown error':
      return m['admin.settings.test.result.unknown_error']();
  }

  const missing = message.match(/^Missing config: (.+)$/);
  if (missing) {
    return m['admin.settings.test.result.missing_config']({
      keys: missing[1],
    });
  }
  const noTest = message.match(/^No test available for "(.+)"$/);
  if (noTest) {
    return m['admin.settings.test.result.no_test']({ group: noTest[1] });
  }
  const status = message.match(/^Request failed \((\d+)\)$/);
  if (status) {
    return m['admin.settings.test.result.request_failed_status']({
      status: status[1],
    });
  }
  const accepted = message.match(/^(.+) accepted the (image |video )?request$/);
  if (accepted) {
    const provider = accepted[1];
    if (accepted[2] === 'image ') {
      return m['admin.settings.test.result.provider_accepted_image']({
        provider,
      });
    }
    if (accepted[2] === 'video ') {
      return m['admin.settings.test.result.provider_accepted_video']({
        provider,
      });
    }
    return m['admin.settings.test.result.provider_accepted']({ provider });
  }
  return message;
}

function TestResultView({ result }: { result: TestResult }) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-lg border p-3 text-sm ${
        result.success
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-destructive/30 bg-destructive/5'
      }`}
    >
      <div className="flex min-w-0 items-start gap-2 font-medium">
        {result.success ? (
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
        )}
        <span
          className={`min-w-0 break-words break-all ${result.success ? '' : 'text-destructive'}`}
        >
          {localizeTestMessage(result.message)}
        </span>
      </div>

      {result.details && Object.keys(result.details).length > 0 && (
        <dl className="mt-3 space-y-1.5 text-xs">
          {Object.entries(result.details).map(([k, v]) => (
            <div key={k} className="grid grid-cols-[auto_1fr] gap-2">
              <dt className="text-muted-foreground whitespace-nowrap">
                {DETAIL_LABEL_MESSAGES[k]?.() ?? k}:
              </dt>
              <dd className="break-all">
                {v?.startsWith('http') ? (
                  <a
                    href={v}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary underline underline-offset-2"
                  >
                    {v}
                  </a>
                ) : (
                  <span className="font-mono">
                    {v === '(empty)'
                      ? m['admin.settings.test.result.empty_reply']()
                      : v}
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
