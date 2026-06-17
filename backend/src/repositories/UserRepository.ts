/**
 * src/repositories/UserRepository.js
 *
 * Data-access layer for the `users` table.
 * All methods are synchronous (better-sqlite3) wrapped in an async
 * interface so callers can treat them uniformly.
 *
 * Unit tests should mock this class and inject it via constructor DI.
 */
import db from "../config/db.js";
import type { User } from "../types.js";

type UpsertPayload = {
  githubId: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  accessToken: string;
  refreshToken: string | null;
};

export class UserRepository {
  async upsert({
    githubId,
    username,
    email,
    avatarUrl,
    accessToken,
    refreshToken,
  }: UpsertPayload): Promise<User | null> {
    const existing = db
      .prepare("SELECT * FROM users WHERE github_id = ?")
      .get(githubId);

    if (existing) {
      db.prepare(
        `UPDATE users
            SET username = ?, email = ?, avatar_url = ?,
                access_token = ?, refresh_token = ?,
                updated_at = datetime('now')
          WHERE github_id = ?`,
      ).run(username, email, avatarUrl, accessToken, refreshToken, githubId);

      return this.findByGithubId(githubId);
    }

    const result = db
      .prepare(
        `INSERT INTO users (github_id, username, email, avatar_url, access_token, refresh_token)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(githubId, username, email, avatarUrl, accessToken, refreshToken);

    return this.findById(Number(result.lastInsertRowid));
  }

  async findById(id: number): Promise<User | null> {
    return (
      (db.prepare("SELECT * FROM users WHERE id = ?").get(id) as unknown as
        | User
        | undefined) ?? null
    );
  }

  async findByGithubId(githubId: string): Promise<User | null> {
    return (
      (db
        .prepare("SELECT * FROM users WHERE github_id = ?")
        .get(githubId) as unknown as User | undefined) ?? null
    );
  }

  async findByUsername(username: string): Promise<User | null> {
    return (
      (db
        .prepare("SELECT * FROM users WHERE username = ?")
        .get(username) as unknown as User | undefined) ?? null
    );
  }
}
