import { z } from "zod";
import { toPublicUser } from "@domain/entities/user.entity";
import { UnauthorizedError, ValidationError } from "@domain/errors/app-error";
import type { UserRepository } from "@domain/repositories/user-repository";
import type { PasswordHasher } from "@domain/services/password-hasher";
import type { TokenService } from "@domain/services/token-service";
import type { AuthSession } from "@application/dtos/auth-session.dto";

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export class LoginUserUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenService: TokenService,
  ) {}

  async execute(rawInput: unknown): Promise<AuthSession> {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "invalid input");
    }
    const { email, password } = parsed.data;

    const user = await this.userRepository.findByEmail(email);
    // Same generic error whether the email doesn't exist or the password
    // is wrong -- distinguishing them would let an attacker enumerate
    // which emails have accounts.
    if (!user) {
      throw new UnauthorizedError("invalid email or password");
    }

    const passwordMatches = await this.passwordHasher.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedError("invalid email or password");
    }

    return {
      user: toPublicUser(user),
      accessToken: this.tokenService.signAccessToken({ sub: user.id }),
      refreshToken: this.tokenService.signRefreshToken({ sub: user.id }),
    };
  }
}
