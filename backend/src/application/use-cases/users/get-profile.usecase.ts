import { toPublicUser, type PublicUser } from "@domain/entities/user.entity";
import { NotFoundError } from "@domain/errors/app-error";
import type { UserRepository } from "@domain/repositories/user-repository";

export class GetProfileUseCase {
  constructor(private readonly userRepository: UserRepository) {}

  async execute(actorId: string): Promise<PublicUser> {
    const user = await this.userRepository.findById(actorId);
    if (!user) {
      throw new NotFoundError(`user ${actorId} not found`);
    }
    return toPublicUser(user);
  }
}
