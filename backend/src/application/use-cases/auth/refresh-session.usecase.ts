import { toPublicUser } from "@domain/entities/user.entity";
import { UnauthorizedError } from "@domain/errors/app-error";
import type { UserRepository } from "@domain/repositories/user-repository";
import type { TokenService } from "@domain/services/token-service";
import type { AuthSession } from "@application/dtos/auth-session.dto";

/**
 * Rotation: every refresh call verifies the presented refresh token and
 * issues a BRAND NEW access+refresh pair -- the old refresh token is never
 * reissued. This is a deliberately stateless rotation (no server-side
 * denylist of spent refresh tokens); see DECISIONS.md for why that's an
 * explicit MVP cut, not an oversight.
 */
export class RefreshSessionUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly tokenService: TokenService,
  ) {}

  async execute(refreshToken: string | undefined): Promise<AuthSession> {
    if (!refreshToken) {
      throw new UnauthorizedError("missing refresh token");
    }

    const { sub: userId } = this.tokenService.verifyRefreshToken(refreshToken);
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError("account no longer exists");
    }

    return {
      user: toPublicUser(user),
      accessToken: this.tokenService.signAccessToken({ sub: user.id }),
      refreshToken: this.tokenService.signRefreshToken({ sub: user.id }),
    };
  }
}
