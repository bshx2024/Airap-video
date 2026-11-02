// PVUV.ai analytics script — rendered as native <script> element
// so the tag lands in SSR HTML directly and is immediately picked up.
export function PvuvAnalytics({ siteId }: { siteId?: string }) {
  const cleanSiteId = siteId?.trim();
  if (!cleanSiteId) return null;

  return (
    <script
      id="pvuv-analytics"
      defer
      src="https://www.pvuv.ai/f.js"
      data-api="https://in.pvuv.ai"
      data-site={cleanSiteId}
    />
  );
}
