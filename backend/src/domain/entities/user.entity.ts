export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  jobTitle: string;
  createdAt: Date;
}

/**
 * What's safe to hand to the presentation layer: never passwordHash.
 * Kept next to the entity (not in a DTO folder) because it's a trivial,
 * fixed projection of it, not something that varies per use case.
 */
export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}
