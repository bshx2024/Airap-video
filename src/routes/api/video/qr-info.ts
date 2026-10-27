import os from 'node:os';
import { createFileRoute } from '@tanstack/react-router';
import { respData, respErr } from '@/lib/resp';

function getLocalLanIp(): string {
  try {
    const nets = os.networkInterfaces();
    // 1. Look for typical home/office Wi-Fi LAN IPs (192.168.x.x, 10.x.x.x)
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          if (net.address.startsWith('192.168.') || net.address.startsWith('10.')) {
            return net.address;
          }
        }
      }
    }
    // 2. Fallback to any non-internal IPv4
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          return net.address;
        }
      }
    }
  } catch (e) {
    console.warn('Failed to detect local LAN IP:', e);
  }
  return 'localhost';
}

async function GET({ request }: { request: Request }) {
  try {
    const reqUrl = new URL(request.url);
    const videoUrl = reqUrl.searchParams.get('url') || '';
    const title = reqUrl.searchParams.get('title') || 'AI Video';
    const filename = reqUrl.searchParams.get('filename') || 'ai-video.mp4';

    if (!videoUrl) {
      return respErr('Parameter "url" is required');
    }

    const host = reqUrl.hostname;
    const port = reqUrl.port ? `:${reqUrl.port}` : '';
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';

    let publicBase = `${reqUrl.protocol}//${reqUrl.host}`;
    let lanIp = host;
    if (isLocalhost) {
      lanIp = getLocalLanIp();
      publicBase = `${reqUrl.protocol}//${lanIp}${port}`;
    }

    // Resolve direct video URL if relative
    let directVideoUrl = videoUrl;
    if (directVideoUrl.startsWith('/')) {
      directVideoUrl = `${publicBase}${directVideoUrl}`;
    }

    const downloadPageParams = new URLSearchParams({
      url: directVideoUrl,
      title,
      filename,
    });

    const mobileDownloadUrl = `${publicBase}/mobile-video-download?${downloadPageParams.toString()}`;

    return respData({
      mobileDownloadUrl,
      directVideoUrl,
      lanIp,
      isLocalhost,
      publicBase,
    });
  } catch (err: any) {
    return respErr(err?.message || 'Failed to generate QR info');
  }
}

export const Route = createFileRoute('/api/video/qr-info')({
  server: {
    handlers: { GET },
  },
});
