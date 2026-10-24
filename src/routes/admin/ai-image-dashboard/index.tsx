'use client';

import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/admin/ai-image-dashboard/')({
  beforeLoad: () => {
    throw redirect({ to: '/admin/ai-video-dashboard' });
  },
});
