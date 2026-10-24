import { describe, expect, it } from 'vitest';

import { adminOperations } from './admin-operations';

const find = (name: string) => adminOperations.find((o) => o.name === name)!;

/**
 * List handlers that read `?search=` (their admin pages send it): the
 * strict operation schema must accept it, or every search returns
 * "Unrecognized key".
 */
const SEARCHABLE_LISTS = [
  'categories_list',
  'credits_list',
  'invite_codes_list',
  'orders_list',
  'posts_list',
  'roles_list',
  'subscriptions_list',
  'users_list',
];

describe('admin list operations accept search', () => {
  it.each(SEARCHABLE_LISTS)('%s', (name) => {
    expect(
      find(name).schema.safeParse({ page: '1', pageSize: '20', search: 'x' })
        .success
    ).toBe(true);
  });

  it('subscriptions_list keeps its filters', () => {
    expect(
      find('subscriptions_list').schema.safeParse({
        search: 'SUB-1',
        interval: 'month',
        status: 'active',
      }).success
    ).toBe(true);
  });
});
