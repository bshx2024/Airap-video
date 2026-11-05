import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  Activity,
  Bot,
  Globe,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

import { apiGet } from '@/lib/api-client';
import { formatDateTime } from '@/lib/time';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export const Route = createFileRoute('/admin/crawler-logs')({
  component: CrawlerLogsPage,
});

interface CrawlerLogItem {
  id: string;
  ip: string;
  country: string;
  method: string;
  path: string;
  statusCode: number;
  botType: string;
  isVerified?: number;
  isContent?: number;
  userAgent: string;
  createdAt: string;
}

interface CrawlerLogsResponse {
  data: CrawlerLogItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: {
    totalAll: number;
    todayHits: number;
    verifiedHits: number;
    contentHits: number;
    googleHits: number;
    bingHits: number;
    openaiHits: number;
    claudeHits: number;
    byteSpiderHits: number;
    ahrefsHits: number;
    scannerHits: number;
  };
}

const BOT_TYPE_OPTIONS = [
  { value: 'all', label: '全部爬虫与蜘蛛 (All)' },
  { value: 'googlebot', label: 'Googlebot' },
  { value: 'bingbot', label: 'Bingbot' },
  { value: 'openai', label: 'OpenAI (ChatGPT/SearchBot)' },
  { value: 'claude', label: 'ClaudeBot (Anthropic)' },
  { value: 'apple', label: 'Applebot' },
  { value: 'perplexity', label: 'PerplexityBot' },
  { value: 'bytespider', label: 'ByteSpider (TikTok)' },
  { value: 'ahrefs', label: 'AhrefsBot' },
  { value: 'semrush', label: 'Semrush' },
  { value: 'scanner', label: '漏洞探测扫描器 (Scanner)' },
  { value: 'other_bot', label: '其他爬虫 (Other)' },
];

function getBotBadge(botType: string, isVerified?: number) {
  const verifiedBadge = isVerified ? (
    <span className="ml-1 inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/20 px-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
      VERIFIED
    </span>
  ) : null;

  switch (botType) {
    case 'googlebot':
      return (
        <div className="flex items-center">
          <Badge className="border-blue-500/30 bg-blue-500/15 text-blue-500">
            Googlebot
          </Badge>
          {verifiedBadge}
        </div>
      );
    case 'bingbot':
      return (
        <div className="flex items-center">
          <Badge className="border-teal-500/30 bg-teal-500/15 text-teal-500">
            Bingbot
          </Badge>
          {verifiedBadge}
        </div>
      );
    case 'openai':
      return (
        <div className="flex items-center">
          <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-500">
            OpenAI
          </Badge>
          {verifiedBadge}
        </div>
      );
    case 'claude':
      return (
        <div className="flex items-center">
          <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-500">
            ClaudeBot
          </Badge>
          {verifiedBadge}
        </div>
      );
    case 'apple':
      return (
        <div className="flex items-center">
          <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-500">
            Applebot
          </Badge>
          {verifiedBadge}
        </div>
      );
    case 'perplexity':
      return (
        <div className="flex items-center">
          <Badge className="border-indigo-500/30 bg-indigo-500/15 text-indigo-500">
            Perplexity
          </Badge>
          {verifiedBadge}
        </div>
      );
    case 'ahrefs':
      return (
        <Badge className="border-orange-500/30 bg-orange-500/15 text-orange-500">
          AhrefsBot
        </Badge>
      );
    case 'semrush':
      return (
        <Badge className="border-purple-500/30 bg-purple-500/15 text-purple-500">
          Semrush
        </Badge>
      );
    case 'bytespider':
      return (
        <div className="flex items-center">
          <Badge className="border-cyan-500/30 bg-cyan-500/15 text-cyan-500">
            ByteSpider
          </Badge>
          {verifiedBadge}
        </div>
      );
    case 'scanner':
      return (
        <Badge className="border-rose-500/30 bg-rose-500/15 text-rose-500">
          Scanner
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {botType}
        </Badge>
      );
  }
}

function getStatusBadge(status: number) {
  if (status >= 200 && status < 300) {
    return (
      <span className="font-mono text-xs font-semibold text-emerald-500">
        {status}
      </span>
    );
  }
  if (status >= 300 && status < 400) {
    return (
      <span className="font-mono text-xs font-semibold text-blue-500">
        {status}
      </span>
    );
  }
  if (status >= 400 && status < 500) {
    return (
      <span className="font-mono text-xs font-semibold text-amber-500">
        {status}
      </span>
    );
  }
  return (
    <span className="font-mono text-xs font-semibold text-rose-500">
      {status}
    </span>
  );
}

export function CrawlerLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [botType, setBotType] = useState('all');
  const [onlyContent, setOnlyContent] = useState(false);
  const [onlyVerified, setOnlyVerified] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isFetching, refetch } =
    useQuery<CrawlerLogsResponse>({
      queryKey: [
        'admin-crawler-logs',
        { page, pageSize, botType, search, onlyContent, onlyVerified },
      ],
      queryFn: async () => {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
        });
        if (botType && botType !== 'all') params.set('botType', botType);
        if (search) params.set('search', search);
        if (onlyContent) params.set('onlyContent', 'true');
        if (onlyVerified) params.set('onlyVerified', 'true');

        const res = await apiGet<CrawlerLogsResponse>(
          `/api/admin/crawler-logs?${params.toString()}`
        );
        return res;
      },
      placeholderData: keepPreviousData,
    });

  const stats = data?.stats || {
    totalAll: 0,
    todayHits: 0,
    verifiedHits: 0,
    contentHits: 0,
    googleHits: 0,
    bingHits: 0,
    openaiHits: 0,
    claudeHits: 0,
    byteSpiderHits: 0,
    ahrefsHits: 0,
    scannerHits: 0,
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  };

  const totalPages = Math.ceil((data?.total || 0) / pageSize) || 1;

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Bot className="text-primary size-6" />
              爬虫与蜘蛛日志 (Crawler Logs)
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              实时监测搜索引擎抓取频次、SEO商业爬虫轨迹及恶意扫描探针
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`size-4 ${isFetching ? 'animate-spin' : ''}`}
            />
            刷新
          </Button>
        </div>

        {/* Overview Stats Cards (Aligned with APIVALE Cohorts) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                今日爬取总数
              </CardTitle>
              <Activity className="text-primary size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.todayHits.toLocaleString()}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                历史累计: {stats.totalAll.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                搜索引擎蜘蛛
              </CardTitle>
              <Globe className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {(stats.googleHits + stats.bingHits).toLocaleString()}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Google: {stats.googleHits} · Bing: {stats.bingHits}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                AI 搜索与索引
              </CardTitle>
              <Sparkles className="size-4 text-cyan-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-500">
                {(stats.openaiHits + stats.claudeHits).toLocaleString()}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                OpenAI: {stats.openaiHits} · Claude: {stats.claudeHits}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                实质页面抓取
              </CardTitle>
              <Bot className="size-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-500">
                {stats.contentHits.toLocaleString()}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                Verified 认证率:{' '}
                {stats.totalAll > 0
                  ? Math.round((stats.verifiedHits / stats.totalAll) * 100)
                  : 0}
                %
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground text-sm font-medium">
                安全与探针拦截
              </CardTitle>
              <ShieldAlert className="size-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">
                {stats.scannerHits.toLocaleString()}
              </div>
              <p className="text-muted-foreground mt-1 text-xs">
                .env / php / 漏洞探针
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form
            onSubmit={handleSearchSubmit}
            className="flex max-w-md flex-1 items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-2.5 left-2.5 size-4" />
              <Input
                placeholder="搜索 IP、请求路径或 User-Agent..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm">
              搜索
            </Button>
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setSearchInput('');
                  setPage(1);
                }}
              >
                清空
              </Button>
            )}
          </form>

          <div className="flex flex-wrap items-center gap-3">
            {/* Quick Cohort Filters from APIVALE */}
            <Button
              type="button"
              variant={onlyContent ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOnlyContent(!onlyContent);
                setPage(1);
              }}
              className="text-xs"
            >
              📄 仅看实质页面 (Content)
            </Button>
            <Button
              type="button"
              variant={onlyVerified ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setOnlyVerified(!onlyVerified);
                setPage(1);
              }}
              className="text-xs"
            >
              🛡️ 仅看 Verified 官方真蜘蛛
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">类型:</span>
              <Select
                value={botType}
                onValueChange={(val) => {
                  setBotType(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="全部爬虫类型" />
                </SelectTrigger>
                <SelectContent>
                  {BOT_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">时间 (Local/UTC)</TableHead>
                  <TableHead className="w-[160px]">爬虫与认证状态</TableHead>
                  <TableHead className="w-[80px]">状态码</TableHead>
                  <TableHead className="w-[160px]">来源 IP / 国家</TableHead>
                  <TableHead className="min-w-[240px]">抓取路径</TableHead>
                  <TableHead className="w-[200px]">User-Agent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell
                        colSpan={6}
                        className="text-muted-foreground h-12 animate-pulse text-center"
                      >
                        加载中...
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.data && data.data.length > 0 ? (
                  data.data.map((item) => (
                    <TableRow
                      key={item.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell className="text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        {getBotBadge(item.botType, item.isVerified)}
                      </TableCell>
                      <TableCell>{getStatusBadge(item.statusCode)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          {item.country && (
                            <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-[10px] font-semibold">
                              {item.country}
                            </span>
                          )}
                          <span>{item.ip}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {item.isContent === 1 ? (
                            <span className="inline-flex items-center rounded bg-emerald-500/15 px-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                              页面
                            </span>
                          ) : (
                            <span className="bg-muted text-muted-foreground inline-flex items-center rounded px-1 text-[9px]">
                              探针
                            </span>
                          )}
                          <Tooltip>
                            <TooltipTrigger className="hover:text-primary block max-w-[300px] cursor-pointer truncate text-left font-mono text-xs transition-colors">
                              <span className="text-muted-foreground mr-1.5 font-semibold">
                                {item.method}
                              </span>
                              {item.path}
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-md font-mono text-xs break-all"
                            >
                              {item.method} {item.path}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger className="text-muted-foreground/80 block max-w-[200px] truncate text-left font-mono text-xs">
                            {item.userAgent}
                          </TooltipTrigger>
                          <TooltipContent
                            side="left"
                            className="max-w-md font-mono text-xs break-all"
                          >
                            {item.userAgent}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground h-32 text-center"
                    >
                      暂无爬虫抓取记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination Footer */}
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <div>
            共{' '}
            <span className="text-foreground font-semibold">
              {data?.total || 0}
            </span>{' '}
            条记录
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              上一页
            </Button>
            <span className="text-xs">
              第 {page} / {totalPages} 页
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              下一页
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
