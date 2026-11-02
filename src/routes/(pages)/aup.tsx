import { createFileRoute } from '@tanstack/react-router';

import { staticPageRouteOptions } from './-static-page';

export const Route = createFileRoute('/(pages)/aup')(
  staticPageRouteOptions('acceptable-use-policy')
);
