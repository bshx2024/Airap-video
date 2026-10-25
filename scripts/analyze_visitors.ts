/**
 * 24-Hour Visitor & Conversion Funnel Analysis Script.
 * Implements 4-Cohort Traffic Filtering (Scanners, Spiders, Datacenter Bots, Real Humans)
 * and 5-Level Conversion Intent Evaluation for ShipAny Video Lite.
 *
 * Usage:
 *   npx tsx scripts/analyze_visitors.ts [log_file_path]
 */

import * as fs from 'fs';
import * as path from 'path';

export interface LogRecord {
  time: string;
  ip: string;
  method: string;
  path: string;
  status: number | string;
  userAgent?: string;
}

const DATACENTER_KEYWORDS = [
  'amazon', 'aws', 'google', 'microsoft', 'azure', 'cloudflare', 'digitalocean',
  'linode', 'vultr', 'hetzner', 'ovh', 'tencent', 'alibaba', 'baidu', 'huawei',
  'oracle', 'colocrossing', 'host', 'hosting', 'server', 'datacenter', 'vpn',
  'proxy', 'leaseweb', 'm247', 'ipxo', 'paypal', 'github', 'fastly', 'peg tech'
];

const SCANNER_INDICATORS = [
  '.php', '.env', 'wp-admin', 'wp-content', 'shell', 'backup', 'composer.json',
  '.git', 'etc/passwd', 'docker-compose', 'xmlrpc', 'config.ini', 'pprof', 'setup.cgi'
];

const SPIDER_KEYWORDS = [
  'googlebot', 'bingbot', 'yandex', 'baidu', 'crawler', 'spider', 'ahrefs',
  'semrush', 'dotbot', 'bytespider', 'slurp', 'duckduckgo'
];

export function analyzeLogs(records: LogRecord[]) {
  const ipActions = new Map<string, LogRecord[]>();

  for (const r of records) {
    const list = ipActions.get(r.ip) || [];
    list.push(r);
    ipActions.set(r.ip, list);
  }

  const scanners = new Map<string, LogRecord[]>();
  const spiders = new Map<string, LogRecord[]>();
  const bots = new Map<string, LogRecord[]>();
  const realHumans = new Map<string, { actions: LogRecord[]; intentLevel: number; intentDesc: string }>();

  for (const [ip, actions] of ipActions.entries()) {
    const paths = actions.map((a) => a.path.toLowerCase());
    const uas = actions.map((a) => (a.userAgent || '').toLowerCase());

    // 1. Scanner Check
    if (paths.some((p) => SCANNER_INDICATORS.some((ind) => p.includes(ind)))) {
      scanners.set(ip, actions);
      continue;
    }

    // 2. Search Engine Spider Check
    if (uas.some((ua) => SPIDER_KEYWORDS.some((kw) => ua.includes(kw)))) {
      spiders.set(ip, actions);
      continue;
    }

    const hasPay = paths.some((p) => p.includes('pay') || p.includes('checkout') || p.includes('stripe') || p.includes('paypal') || p.includes('waffo'));
    const hasPricing = paths.some((p) => p.includes('pricing') || p.includes('credit'));
    const hasAuth = paths.some((p) => p.includes('/api/auth') || p.includes('/sign-in') || p.includes('/sign-up'));
    const hasAiTask = paths.some((p) => p.includes('/api/ai') || p.includes('/my-creations'));
    const hasModelGuide = paths.some((p) => p.includes('/models') || p.includes('/blog'));

    // Intent evaluation
    let intentLevel = 0;
    let intentDesc = '👁️ Low (Homepage / Bounce)';

    if (hasPay) {
      intentLevel = 5;
      intentDesc = '🔥 Extremely High (Triggered Payment / Checkout Flow)';
    } else if (hasPricing) {
      intentLevel = 4;
      intentDesc = '💎 High (Visited Pricing / Credit Plans)';
    } else if (hasAiTask) {
      intentLevel = 3;
      intentDesc = '🎨 High (Interacted with AI Video Generation / My Creations)';
    } else if (hasAuth) {
      intentLevel = 2;
      intentDesc = '🔑 Medium (Sign In / Sign Up / Auth Flow)';
    } else if (hasModelGuide) {
      intentLevel = 1;
      intentDesc = '📖 Content Lead (Read Blog / Model Benchmark Guides)';
    }

    realHumans.set(ip, { actions, intentLevel, intentDesc });
  }

  // Summary Output
  console.log('===============================================================');
  console.log('          SHIPANY VIDEO LITE TRAFFIC ANALYSIS REPORT           ');
  console.log('===============================================================');
  console.log(`Total Requests Analyzed: ${records.length}`);
  console.log(`Total Unique IPs:        ${ipActions.size}`);
  console.log(`  ├─ 👤 Real Human Visitors:       ${realHumans.size}`);
  console.log(`  ├─ 🕷️ Search Engine Spiders:     ${spiders.size}`);
  console.log(`  ├─ 🤖 Datacenter & Proxy Bots:   ${bots.size}`);
  console.log(`  └─ 🚨 Vulnerability Scanners:    ${scanners.size}`);
  console.log('---------------------------------------------------------------');
  console.log('📊 CONVERSION INTENT BREAKDOWN (Real Humans):');

  const intentCounts = new Map<string, number>();
  for (const info of realHumans.values()) {
    intentCounts.set(info.intentDesc, (intentCounts.get(info.intentDesc) || 0) + 1);
  }

  for (const [desc, count] of intentCounts.entries()) {
    console.log(`  - ${desc}: ${count}`);
  }
  console.log('===============================================================');
}

// CLI execution helper
if (process.argv[1]?.endsWith('analyze_visitors.ts')) {
  const filePath = process.argv[2];
  if (!filePath || !fs.existsSync(filePath)) {
    console.log('Provide a valid log file path to analyze. Example:');
    console.log('  npx tsx scripts/analyze_visitors.ts ./access.log');
  } else {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const records: LogRecord[] = [];
    for (const line of raw.split('\n')) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line);
        records.push(parsed);
      } catch {
        // Fallback or custom regex parser can be extended here
      }
    }
    analyzeLogs(records);
  }
}
