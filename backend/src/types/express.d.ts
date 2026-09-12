declare global {
  namespace Express {
    interface Request {
      user?: { id: number; username: string; role: string; permissions: string[]; company_id: number | null; branch_id: number | null; branch_ids: number[]; is_super_admin: boolean };
    }
  }
}
export {};
