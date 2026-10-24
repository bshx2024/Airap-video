import { createFileRoute } from '@tanstack/react-router';

import { handlers } from './upload-media';

/** @deprecated Prefer `/api/storage/upload-media`. Kept for backward compatibility. */
export const Route = createFileRoute('/api/storage/upload-image')({
  server: {
    handlers,
  },
});
