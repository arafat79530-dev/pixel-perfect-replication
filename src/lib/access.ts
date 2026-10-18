export type AccessStatus = 'pending' | 'approved' | 'rejected' | 'revoked';
export function isApproved(status: string | null | undefined) { return status === 'approved'; }
export function canDecideAccess(isAdmin: boolean, targetIsAdmin: boolean) { return isAdmin && !targetIsAdmin; }