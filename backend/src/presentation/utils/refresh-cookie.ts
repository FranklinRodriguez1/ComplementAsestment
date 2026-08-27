import type { Response } from "express";

export const REFRESH_COOKIE_NAME = "refresh_token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * httpOnly so client-side JS can never read the refresh token (the one
 * thing standing between an XSS bug and full account takeover), `secure`
 * outside development so it's never sent over plain HTTP, and `sameSite:
 * lax` so it isn't attached to cross-site requests either.
 */
export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SEVEN_DAYS_MS,
    path: "/",
  });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
}
