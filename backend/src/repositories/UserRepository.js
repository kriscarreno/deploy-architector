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

export class UserRepository {
  /**
   * Upsert a user coming from GitHub OAuth.
   * Updates tokens and profile on every login (tokens rotate).
   */
  async upsert({
    githubId,
    username,
    email,
    avatarUrl,
    accessToken,
    refreshToken,
  }) {
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

    return this.findById(result.lastInsertRowid);
  }

  async findById(id) {
    return db.prepare("SELECT * FROM users WHERE id = ?").get(id) ?? null;
  }

  async findByGithubId(githubId) {
    return (
      db.prepare("SELECT * FROM users WHERE github_id = ?").get(githubId) ??
      null
    );
  }
}
