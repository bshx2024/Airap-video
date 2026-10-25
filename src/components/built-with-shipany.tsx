'use client';

import { useEffect, useState } from 'react';

import { envConfigs } from '@/config';
import { cn } from '@/lib/utils';
import { m } from '@/paraglide/messages.js';
import { usePublicConfig } from '@/hooks/use-public-config';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function BuiltWithShipAny({ className }: { className?: string }) {
  return null;
}
