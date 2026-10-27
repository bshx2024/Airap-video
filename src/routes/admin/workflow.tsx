import { createFileRoute } from '@tanstack/react-router';
import { WorkflowEditor } from '@/components/workflow/WorkflowEditor';

export const Route = createFileRoute('/admin/workflow')({
  component: AdminWorkflowPage,
});

function AdminWorkflowPage() {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <WorkflowEditor />
    </div>
  );
}
