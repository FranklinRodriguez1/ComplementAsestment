import type { Pool } from "pg";
import type { User } from "@domain/entities/user.entity";
import { NotFoundError } from "@domain/errors/app-error";
import type {
  CreateUserInput,
  UpdateProfileInput,
  UserRepository,
} from "@domain/repositories/user-repository";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  job_title: string;
  created_at: Date;
}

function mapUserRow(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    fullName: row.full_name,
    jobTitle: row.job_title,
    createdAt: row.created_at,
  };
}

/**
 * rw_users carries no RLS (see database/README.md), so these queries run
 * straight against the pool -- no withActorTransaction needed, except
 * updateProfile, which calls rw_sp_edit_or_delete_user: that procedure's
 * own actor_id/target_user_id equality check IS the permission boundary,
 * not a Postgres GUC.
 */
export class PgUserRepository implements UserRepository {
  constructor(private readonly pool: Pool) {}

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      "SELECT * FROM rw_users WHERE email = $1 AND deleted_at IS NULL",
      [email.toLowerCase()],
    );
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.pool.query<UserRow>(
      "SELECT * FROM rw_users WHERE id = $1 AND deleted_at IS NULL",
      [id],
    );
    return result.rows[0] ? mapUserRow(result.rows[0]) : null;
  }

  async create(input: CreateUserInput): Promise<User> {
    const result = await this.pool.query<UserRow>(
      `INSERT INTO rw_users (email, password_hash, full_name, job_title)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [input.email.toLowerCase(), input.passwordHash, input.fullName, input.jobTitle],
    );
    return mapUserRow(result.rows[0]);
  }

  async updateProfile(actorId: string, input: UpdateProfileInput): Promise<User> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "CALL rw_sp_edit_or_delete_user($1, $1, $2, $3, false)",
        [actorId, input.fullName ?? null, input.jobTitle ?? null],
      );
      const result = await client.query<UserRow>(
        "SELECT * FROM rw_users WHERE id = $1 AND deleted_at IS NULL",
        [actorId],
      );
      await client.query("COMMIT");
      if (!result.rows[0]) {
        throw new NotFoundError(`user ${actorId} not found`);
      }
      return mapUserRow(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
