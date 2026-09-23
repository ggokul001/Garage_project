export function isCompanyWideRole(role: string | null | undefined, branchIds: readonly number[] = []) {
  return role === 'SUPER_ADMIN' || role === 'COMPANY_ADMIN' || (role === 'ADMIN' && branchIds.length === 0);
}

export function canAccessBranch(role: string | null | undefined, branchId: number, branchIds: readonly number[] = []) {
  return isCompanyWideRole(role, branchIds) || branchIds.includes(branchId);
}
