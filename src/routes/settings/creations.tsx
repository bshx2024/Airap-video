'use client';

import { createFileRoute } from '@tanstack/react-router';

import { WorkspaceRecentCreations } from '@/components/sites/workspace/WorkspaceRecentCreations';

export const Route = createFileRoute('/settings/creations')({
  ssr: false,
  validateSearch: (
    search: Record<string, unknown>
  ): { page?: number; model?: string } => ({
    page: search.page ? Number(search.page) : undefined,
    model:
      typeof search.model === 'string' && search.model
        ? search.model
        : undefined,
  }),
  component: SettingsCreationsPage,
});

function SettingsCreationsPage() {
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const page = Math.max(1, Number(search.page) || 1);
  const selectedModel = search.model || 'all';

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
      <WorkspaceRecentCreations
        isSettingsPage
        filterMediaType="video"
        filterModel={selectedModel !== 'all' ? selectedModel : undefined}
        onModelChange={(newModel) => {
          navigate({
            search: (prev) => ({
              ...prev,
              model: !newModel || newModel === 'all' ? undefined : newModel,
              page: undefined,
            }),
            replace: true,
          });
        }}
        page={page}
        onPageChange={(nextPage) => {
          navigate({
            search: (prev) => ({
              ...prev,
              page: nextPage <= 1 ? undefined : nextPage,
            }),
            replace: true,
          });
        }}
      />
    </div>
  );
}
