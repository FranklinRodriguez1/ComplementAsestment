import type { User } from "../entities/user.entity";

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName: string;
  jobTitle: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  jobTitle?: string;
}

/**
 * rw_users has no RLS (see database/README.md): any authenticated request
 * can look up a user by id to render an author name, so these methods
 * don't need an actor/transaction wrapper the way channel/message
 * repositories do -- except updateProfile, which goes through
 * rw_sp_edit_or_delete_user, whose own actor_id/target_user_id check is
 * the real permission boundary (self-only).
 */
export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  updateProfile(actorId: string, input: UpdateProfileInput): Promise<User>;
}
