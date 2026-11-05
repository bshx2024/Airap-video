import { createFileRoute } from '@tanstack/react-router';

import { VideoHeader } from '@/components/sites/video-lite/VideoHeader';
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor';

export const Route = createFileRoute('/tools/workflow')({
  head: () => ({
    meta: [
      { title: 'AI Rap Video Visual Workflow Studio · Coze Edition' },
      {
        name: 'description',
        content: 'Node-based visual workflow debugger for AI Rap MV generation',
      },
      { name: 'robots', content: 'noindex, nofollow, noarchive, nosnippet' },
      { name: 'googlebot', content: 'noindex, nofollow, noarchive, nosnippet' },
      { name: 'bingbot', content: 'noindex, nofollow, noarchive, nosnippet' },
      {
        name: 'baiduspider',
        content: 'noindex, nofollow, noarchive, nosnippet',
      },
      {
        name: 'bytespider',
        content: 'noindex, nofollow, noarchive, nosnippet',
      },
    ],
  }),
  component: ToolsWorkflowRoute,
});

function ToolsWorkflowRoute() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#060b17] text-white">
      <VideoHeader />
      <main className="flex-1 overflow-hidden pt-16">
        <WorkflowEditor />
      </main>
    </div>
  );
}
