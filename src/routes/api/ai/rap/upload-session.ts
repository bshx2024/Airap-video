import os from 'node:os';
import { createFileRoute } from '@tanstack/react-router';

import { respData, respErr } from '@/lib/resp';

interface UploadSession {
  sessionId: string;
  slot: number;
  status: 'pending' | 'completed' | 'expired';
  imageUrls: string[];
  filename?: string;
  createdAt: number;
  expiresAt: number;
}

// In-memory cross-device session store (survives dev HMR via globalThis)
const globalStore = globalThis as unknown as {
  __RAP_UPLOAD_SESSIONS__?: Map<string, UploadSession>;
};

if (!globalStore.__RAP_UPLOAD_SESSIONS__) {
  globalStore.__RAP_UPLOAD_SESSIONS__ = new Map<string, UploadSession>();
}
const sessions = globalStore.__RAP_UPLOAD_SESSIONS__;

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [id, sess] of sessions.entries()) {
    if (sess.expiresAt < now) {
      sessions.delete(id);
    }
  }
}

function getLocalLanIp(): string {
  try {
    const nets = os.networkInterfaces();
    // 1. Look for typical home/office Wi-Fi LAN IPs (192.168.x.x, 10.x.x.x)
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          if (
            net.address.startsWith('192.168.') ||
            net.address.startsWith('10.')
          ) {
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

async function POST({ request }: { request: Request }) {
  cleanExpiredSessions();
  try {
    const body = await request.json().catch(() => ({}));
    const { action = 'create' } = body;

    if (action === 'create') {
      const slot = Number(body.slot) || 1;
      const role = body.role || (slot === 1 ? 'Lead MC' : 'Hype MC');
      const sessionId =
        Math.random().toString(36).substring(2, 9) +
        Date.now().toString(36).substring(4);
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 mins TTL

      sessions.set(sessionId, {
        sessionId,
        slot,
        status: 'pending',
        imageUrls: [],
        createdAt: Date.now(),
        expiresAt,
      });

      const requestUrl = new URL(request.url);
      const host = requestUrl.hostname;
      const port = requestUrl.port ? `:${requestUrl.port}` : '';

      // If accessing via localhost on PC, convert to LAN IP so mobile phone on same Wi-Fi can open it
      let publicBase = `${requestUrl.protocol}//${requestUrl.host}`;
      if (host === 'localhost' || host === '127.0.0.1') {
        const lanIp = getLocalLanIp();
        publicBase = `${requestUrl.protocol}//${lanIp}${port}`;
      }

      const uploadUrl = `${publicBase}/mobile-rap-upload?sessionId=${sessionId}&slot=${slot}&role=${encodeURIComponent(
        role
      )}`;

      return respData({
        sessionId,
        uploadUrl,
        expiresAt,
        slot,
      });
    }

    if (action === 'upload') {
      const { sessionId, imageUrl, imageUrls = [], filename } = body;
      if (!sessionId) {
        return respErr('Session ID is required');
      }

      const session = sessions.get(sessionId);
      if (!session) {
        return respErr('Upload session expired or not found. Please rescan.');
      }

      if (session.expiresAt < Date.now()) {
        sessions.delete(sessionId);
        return respErr('Upload session expired. Please refresh the QR code.');
      }

      const finalUrls =
        Array.isArray(imageUrls) && imageUrls.length > 0
          ? imageUrls
          : imageUrl
            ? [imageUrl]
            : [];

      if (finalUrls.length === 0) {
        return respErr('No image data provided.');
      }

      session.status = 'completed';
      session.imageUrls = finalUrls;
      session.filename = filename || `mobile-photo-${Date.now()}.png`;

      return respData({
        success: true,
        message: 'Photo beamed to PC successfully!',
        sessionId,
      });
    }

    return respErr(`Unsupported action: ${action}`);
  } catch (error: any) {
    return respErr(error.message || 'Session processing failed');
  }
}

async function GET({ request }: { request: Request }) {
  cleanExpiredSessions();
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return respErr('Session ID is required');
    }

    const session = sessions.get(sessionId);
    if (!session) {
      return respData({ status: 'expired' });
    }

    if (session.expiresAt < Date.now()) {
      sessions.delete(sessionId);
      return respData({ status: 'expired' });
    }

    return respData({
      status: session.status,
      slot: session.slot,
      imageUrls: session.imageUrls,
      filename: session.filename,
      expiresAt: session.expiresAt,
    });
  } catch (error: any) {
    return respErr(error.message || 'Failed to query session');
  }
}

export const Route = createFileRoute('/api/ai/rap/upload-session')({
  server: {
    handlers: { GET, POST },
  },
});
