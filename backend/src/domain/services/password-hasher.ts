/**
 * Port for password hashing. The domain never sees bcryptjs directly --
 * only infrastructure/auth/bcrypt-password-hasher.ts does -- so the
 * algorithm could be swapped (e.g. to argon2) without touching a single
 * use case.
 */
export interface PasswordHasher {
  hash(plainPassword: string): Promise<string>;
  compare(plainPassword: string, passwordHash: string): Promise<boolean>;
}
