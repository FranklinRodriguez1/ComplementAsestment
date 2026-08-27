import jwt from "jsonwebtoken";
import { UnauthorizedError } from "@domain/errors/app-error";
import type { TokenPayload, TokenService } from "@domain/services/token-service";

/**
 * Two separate secrets for access vs. refresh tokens (both required, no
 * fallback default): a leaked access-token secret must not also be able to
 * forge long-lived refresh tokens, and vice versa.
 */
export class JwtTokenService implements TokenService {
  constructor(
    private readonly accessSecret: string,
    private readonly accessExpiresIn: string,
    private readonly refreshSecret: string,
    private readonly refreshExpiresIn: string,
  ) {}

  signAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.accessSecret, { expiresIn: this.accessExpiresIn } as jwt.SignOptions);
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verify(token, this.accessSecret);
  }

  signRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.refreshSecret, { expiresIn: this.refreshExpiresIn } as jwt.SignOptions);
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.verify(token, this.refreshSecret);
  }

  private verify(token: string, secret: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === "string" || typeof decoded.sub !== "string") {
        throw new UnauthorizedError("malformed token payload");
      }
      return { sub: decoded.sub };
    } catch {
      throw new UnauthorizedError("invalid or expired token");
    }
  }
}
