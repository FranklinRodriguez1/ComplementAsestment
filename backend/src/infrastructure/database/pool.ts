import { Pool } from "pg";

/**
 * Single pool for the whole process, connecting as rw_app (see
 * database/ddl/002_roles.sql) -- a role with no BYPASSRLS, so every query
 * run through it is subject to the RLS policies in database/policies/.
 * There is no separate "admin" pool anywhere in this codebase: the backend
 * is never meant to run migrations, only application queries.
 */
export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// An IDLE pooled connection can still error (db restart, network drop);
// without a listener that's an unhandled 'error' event, which kills the
// whole Node process. Active queries are unaffected -- their own promise
// rejection already flows through each repository's error handling.
pool.on("error", (error) => {
  console.error("idle database connection error:", error.message);
});
