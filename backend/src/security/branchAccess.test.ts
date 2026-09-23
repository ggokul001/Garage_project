import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessBranch, isCompanyWideRole } from './branchAccess';

test('company administrators can access every company branch', () => {
  assert.equal(isCompanyWideRole('COMPANY_ADMIN', [10]), true);
  assert.equal(canAccessBranch('COMPANY_ADMIN', 20, [10]), true);
});

test('branch users stay limited to assigned branches', () => {
  assert.equal(canAccessBranch('USER', 10, [10]), true);
  assert.equal(canAccessBranch('USER', 20, [10]), false);
});

test('scoped admins remain limited when branch access is explicitly assigned', () => {
  assert.equal(isCompanyWideRole('ADMIN', [10]), false);
  assert.equal(canAccessBranch('ADMIN', 20, [10]), false);
});
