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
    googleHits: number;
    bingHits: number;
    ahrefsHits: number;
    scannerHits: number;
  };
}

const BOT_TYPE_OPTIONS = [
  { value: 'all', label: 'All Bots & Spiders' },
  { value: 'googlebot', label: 'Googlebot' },
  { value: 'bingbot', label: 'Bingbot' },
  { value: 'ahrefs', label: 'AhrefsBot' },
  { value: 'semrush', label: 'Semrush' },
  { value: 'bytespider', label: 'ByteSpider (TikTok)' },
  { value: 'scanner', label: 'Vulnerability Scanner' },
  { value: 'other_bot', label: 'Other Crawlers' },
];

function getBotBadge(botType: string) {
  switch (botType) {
    case 'googlebot':
      return <Badge className="bg-blue-500/15 text-blue-500 border-blue-500/30">Googlebot</Badge>;
    case 'bingbot':
      return <Badge className="bg-emerald-500/15 text-emerald-500 border-emerald-500/30">Bingbot</Badge>;
    case 'ahrefs':
      return <Badge className="bg-orange-500/15 text-orange-500 border-orange-500/30">AhrefsBot</Badge>;
    case 'semrush':
      return <Badge className="bg-purple-500/15 text-purple-500 border-purple-500/30">Semrush</Badge>;
    case 'bytespider':
      return <Badge className="bg-cyan-500/15 text-cyan-500 border-cyan-500/30">ByteSpider</Badge>;
    case 'scanner':
      return <Badge className="bg-rose-500/15 text-rose-500 border-rose-500/30">Scanner</Badge>;
    default:
      return <Badge variant="outline" className="text-muted-foreground">{botType}</Badge>;
  }
}

function getStatusBadge(status: number) {
  if (status >= 200 && status < 300) {
    return <span className="font-mono text-xs font-semibold text-emerald-500">{status}</span>;
  }
  if (status >= 300 && status < 400) {
    return <span className="font-mono text-xs font-semibold text-blue-500">{status}</span>;
  }
  if (status >= 400 && status < 500) {
    return <span className="font-mono text-xs font-semibold text-amber-500">{status}</span>;
  }
  return <span className="font-mono text-xs font-semibold text-rose-500">{status}</span>;
}

export function CrawlerLogsPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [botType, setBotType] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, isFetching, refetch } = useQuery<CrawlerLogsResponse>({
    queryKey: ['admin-crawler-logs', { page, pageSize, botType, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (botType && botType !== 'all') params.set('botType', botType);
      if (search) params.set('search', search);

      const res = await apiGet<CrawlerLogsResponse>(`/api/admin/crawler-logs?${params.toString()}`);
      return res;
    },
    placeholderData: keepPreviousData,
  });

  const stats = data?.stats || {
    totalAll: 0,
    todayHits: 0,
    googleHits: 0,
    bingHits: 0,
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
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Bot className="size-6 text-primary" />
              爬虫与蜘蛛日志 (Crawler Logs)
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
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
            <RefreshCw className={`size-4 ${isFetching ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>

        {/* Overview Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">今日爬取总频次</CardTitle>
              <Activity className="size-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todayHits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">历史累计: {stats.totalAll.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">搜索引擎蜘蛛</CardTitle>
              <Globe className="size-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {(stats.googleHits + stats.bingHits).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Google: {stats.googleHits} · Bing: {stats.bingHits}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">商业 SEO 爬虫</CardTitle>
              <Sparkles className="size-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-500">{stats.ahrefsHits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">AhrefsBot / Semrush 抓取</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">恶意路径扫描</CardTitle>
              <ShieldAlert className="size-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-rose-500">{stats.scannerHits.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">.env / php / wp 探针拦截</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
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

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">类型筛选:</span>
            <Select
              value={botType}
              onValueChange={(val) => {
                setBotType(val);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
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

        {/* Data Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">时间 (UTC/Local)</TableHead>
                  <TableHead className="w-[140px]">爬虫类型</TableHead>
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
                      <TableCell colSpan={6} className="h-12 text-center text-muted-foreground animate-pulse">
                        加载中...
                      </TableCell>
                    </TableRow>
                  ))
                ) : data?.data && data.data.length > 0 ? (
                  data.data.map((item) => (
                    <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell>{getBotBadge(item.botType)}</TableCell>
                      <TableCell>{getStatusBadge(item.statusCode)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 font-mono text-xs">
                          {item.country && (
                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground font-semibold">
                              {item.country}
                            </span>
                          )}
                          <span>{item.ip}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger className="font-mono text-xs text-left block truncate max-w-[340px] hover:text-primary transition-colors cursor-pointer">
                            <span className="text-muted-foreground mr-1.5 font-semibold">{item.method}</span>
                            {item.path}
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-md break-all font-mono text-xs">
                            {item.method} {item.path}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip>
                          <TooltipTrigger className="font-mono text-xs text-muted-foreground/80 block truncate max-w-[200px] text-left">
                            {item.userAgent}
                          </TooltipTrigger>
                          <TooltipContent side="left" className="max-w-md break-all font-mono text-xs">
                            {item.userAgent}
                          </TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      暂无爬虫抓取记录
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Pagination Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div>
            共 <span className="font-semibold text-foreground">{data?.total || 0}</span> 条记录
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
