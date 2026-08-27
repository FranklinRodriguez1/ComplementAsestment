import { z } from "zod";
import { toPublicUser } from "@domain/entities/user.entity";
import { ConflictError, ValidationError } from "@domain/errors/app-error";
import type { UserRepository } from "@domain/repositories/user-repository";
import type { PasswordHasher } from "@domain/services/password-hasher";
import type { TokenService } from "@domain/services/token-service";
import type { AuthSession } from "@application/dtos/auth-session.dto";

const inputSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(1).max(200),
  jobTitle: z.string().trim().min(1).max(200),
});

export type RegisterUserInput = z.infer<typeof inputSchema>;

/**
 * A thin use case, as the assignment asks: validate input -> call the
 * repository -> map to a DTO. The only "logic" is checking for an existing
 * email up front so a duplicate signup gets a clean 409 instead of falling
 * through to the database's UNIQUE constraint as a raw error.
 */
export class RegisterUserUseCase {
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
    const input = parsed.data;

    const existing = await this.userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError(`an account with email ${input.email} already exists`);
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const user = await this.userRepository.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      jobTitle: input.jobTitle,
    });

    return {
      user: toPublicUser(user),
      accessToken: this.tokenService.signAccessToken({ sub: user.id }),
      refreshToken: this.tokenService.signRefreshToken({ sub: user.id }),
    };
  }
}
