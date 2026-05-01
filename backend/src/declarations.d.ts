/**
 * src/declarations.d.ts
 *
 * Type declarations for packages that ship without official @types.
 */

// ── passport-github2 ─────────────────────────────────────────────────────
declare module "passport-github2" {
  import type { Strategy as PassportStrategy } from "passport";

  export interface GithubProfile {
    id: string;
    username: string;
    displayName: string;
    emails?: Array<{ value: string }>;
    photos?: Array<{ value: string }>;
  }

  export interface StrategyOptions {
    clientID: string;
    clientSecret: string;
    callbackURL: string;
    scope?: string[];
  }

  type VerifyCallback = (
    err: Error | null,
    user?: Express.User | false,
  ) => void;

  export class Strategy extends PassportStrategy {
    constructor(
      options: StrategyOptions,
      verify: (
        accessToken: string,
        refreshToken: string,
        profile: GithubProfile,
        done: VerifyCallback,
      ) => void,
    );
  }
}

// ── yamljs ───────────────────────────────────────────────────────────────
declare module "yamljs" {
  const YAML: {
    load(path: string): Record<string, unknown>;
    parse(yaml: string): Record<string, unknown>;
    stringify(object: unknown, inline?: number, spaces?: number): string;
  };
  export default YAML;
}
