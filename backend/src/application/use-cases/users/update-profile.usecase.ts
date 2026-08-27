import { z } from "zod";
import { toPublicUser, type PublicUser } from "@domain/entities/user.entity";
import { ValidationError } from "@domain/errors/app-error";
import type { UserRepository } from "@domain/repositories/user-repository";

const inputSchema = z
  .object({
    fullName: z.string().trim().min(1).max(200).optional(),
    jobTitle: z.string().trim().min(1).max(200).optional(),
  })
  .refine((v) => v.fullName !== undefined || v.jobTitle !== undefined, {
    message: "provide fullName and/or jobTitle",
  });

/**
 * actorId is the only user this can ever target: it's threaded straight
 * into rw_sp_edit_or_delete_user as BOTH actor_id and target_user_id (see
 * PgUserRepository.updateProfile), which is the procedure's own
 * self-only permission check -- there is no "edit someone else's profile"
 * code path to accidentally expose here.
 */
export class UpdateProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(actorId: string, rawInput: unknown): Promise<PublicUser> {
    const parsed = inputSchema.safeParse(rawInput);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? "invalid input");
    }

    const user = await this.userRepository.updateProfile(actorId, parsed.data);
    return toPublicUser(user);
  }
}
