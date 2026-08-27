import type { PublicUser } from "@domain/entities/user.entity";

export interface AuthSession {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
}
