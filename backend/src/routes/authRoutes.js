/**
 * src/routes/authRoutes.js
 *
 * GitHub OAuth routes — public (no auth required).
 *
 * GET  /auth/github           → redirects to GitHub
 * GET  /auth/github/callback  → handles callback, sets session, redirects
 * POST /auth/logout           → destroys session
 * GET  /auth/me               → returns authenticated user info
 */
import { Router } from "express";
import passport from "passport";
import { env } from "../config/env.js";
import { UnauthorizedError } from "../utils/errors.js";

const router = Router();

// Redirect to GitHub for authorization
router.get("/github", passport.authenticate("github"));

// GitHub callback
router.get(
  "/github/callback",
  passport.authenticate("github", { failureRedirect: "/auth/failed" }),
  (req, res) => {
    // Redirect to the frontend callback page so the SPA toma control
    res.redirect(`${env.FRONTEND_URL}/oauth/callback`);
  },
);

router.get("/failed", (_req, res) => {
  res.status(401).json({ error: "GitHub authentication failed" });
});

router.post("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ data: { message: "Logged out" } }));
  });
});

router.get("/me", (req, res) => {
  if (!req.isAuthenticated()) throw new UnauthorizedError();
  // Never expose access_token or refresh_token to the client
  const { access_token, refresh_token, ...safeUser } = req.user;
  res.json({ data: safeUser });
});

export default router;
