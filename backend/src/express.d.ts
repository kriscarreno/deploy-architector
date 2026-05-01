/**
 * src/express.d.ts
 *
 * Augments the Express namespace to type req.user and req.correlationId
 * globally, so every controller and middleware gets the correct types
 * without needing to import anything.
 */

declare global {
  namespace Express {
    interface User {
      id: number;
      github_id: string;
      username: string;
      email: string | null;
      avatar_url: string | null;
      access_token: string;
      refresh_token: string | null;
      created_at: string;
      updated_at: string;
    }

    interface Request {
      correlationId?: string;
    }
  }
}

export {};
