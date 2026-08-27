export interface TokenPayload {
  sub: string;
}

/**
 * Port for issuing/verifying the two JWTs the API relies on: a short-lived
 * access token, and a longer-lived refresh token that gets rotated on
 * every use (see application/use-cases/auth/refresh-session.usecase.ts).
 */
export interface TokenService {
  signAccessToken(payload: TokenPayload): string;
  verifyAccessToken(token: string): TokenPayload;
  signRefreshToken(payload: TokenPayload): string;
  verifyRefreshToken(token: string): TokenPayload;
}
