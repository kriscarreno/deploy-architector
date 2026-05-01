/**
 * src/config/passport.js
 *
 * Configures passport-github2 strategy.
 *
 * Flow:
 *  1. User hits GET /auth/github → redirected to GitHub
 *  2. GitHub redirects to /auth/github/callback with ?code=
 *  3. passport exchanges code for tokens, calls verify callback
 *  4. We upsert the user in SQLite and store tokens
 *  5. passport serialises the user.id into the session cookie
 *
 * NOTE: We import UserRepository lazily to avoid circular-dependency
 * issues at startup (passport is configured before routes are loaded).
 */
import passport from "passport";
import { Strategy as GitHubStrategy } from "passport-github2";
import { env } from "./env.js";
import logger from "./logger.js";

export function configurePassport(userRepository) {
  passport.use(
    new GitHubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: env.GITHUB_CALLBACK_URL,
        // repo: acceso completo a repos privados (personales y de org)
        // read:org: necesario para que el token funcione con repos de organizaciones
        scope: ["user:email", "repo", "read:org"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          logger.info("GitHub OAuth callback", { githubId: profile.id });

          const user = await userRepository.upsert({
            githubId: profile.id,
            username: profile.username,
            email: profile.emails?.[0]?.value ?? null,
            avatarUrl: profile.photos?.[0]?.value ?? null,
            accessToken,
            // GitHub OAuth 2 rarely issues refresh tokens — store if present
            refreshToken: refreshToken ?? null,
          });

          return done(null, user);
        } catch (err) {
          logger.error("GitHub strategy error", { err: err.message });
          return done(err);
        }
      },
    ),
  );

  // Store only the user id in the session cookie (small payload)
  passport.serializeUser((user, done) => done(null, user.id));

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await userRepository.findById(id);
      done(null, user ?? false);
    } catch (err) {
      done(err);
    }
  });

  return passport;
}
