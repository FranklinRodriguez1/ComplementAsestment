import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  asActor,
  cleanupFixture,
  closePools,
  createFixture,
  fakeEmbedding,
  type Fixture,
} from "./helpers/db";

/**
 * The two QA-mandated security tests (plus close relatives), run against
 * the REAL PostgreSQL schema as the REAL application role (rw_app), not
 * mocks: they prove the non-negotiable isolation rules hold in SQL itself,
 * below the application layer.
 */

let fixture: Fixture;

beforeAll(async () => {
  fixture = await createFixture();
});

afterAll(async () => {
  await cleanupFixture(fixture);
  await closePools();
});

describe("RLS isolation on a private channel", () => {
  test("a member can read the channel's messages", async () => {
    const rows = await asActor(fixture.memberId, async (client) => {
      const result = await client.query("SELECT id, content FROM rw_messages WHERE channel_id = $1", [
        fixture.channelId,
      ]);
      return result.rows;
    });
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe(fixture.messageId);
  });

  test("a non-member gets ZERO rows from the same query (no leak, not an error)", async () => {
    const rows = await asActor(fixture.outsiderId, async (client) => {
      const result = await client.query("SELECT id FROM rw_messages WHERE channel_id = $1", [
        fixture.channelId,
      ]);
      return result.rows;
    });
    expect(rows.length).toBe(0);
  });

  test("a non-member cannot even see that the channel exists", async () => {
    const rows = await asActor(fixture.outsiderId, async (client) => {
      const result = await client.query("SELECT id FROM rw_channels WHERE id = $1", [fixture.channelId]);
      return result.rows;
    });
    expect(rows.length).toBe(0);
  });

  test("a non-member's INSERT into the channel is rejected by RLS (42501)", async () => {
    expect(
      asActor(fixture.outsiderId, (client) =>
        client.query("INSERT INTO rw_messages (channel_id, user_id, content) VALUES ($1, $2, 'intruder')", [
          fixture.channelId,
          fixture.outsiderId,
        ]),
      ),
    ).rejects.toMatchObject({ code: "42501" });
  });

  test("full-text search leaks nothing to a non-member", async () => {
    // Same shape as PgMessageRepository.search: the seeded message matches
    // the query, but the SELECT policy filters it out before ts_rank sees it.
    const rows = await asActor(fixture.outsiderId, async (client) => {
      const result = await client.query(
        `SELECT id FROM rw_messages
         WHERE search_vector @@ plainto_tsquery('english', 'launch code review')
           AND deleted_at IS NULL`,
      );
      return result.rows;
    });
    expect(rows.length).toBe(0);
  });
});

describe("copilot retrieval respects membership", () => {
  test("rw_fn_copilot_context returns the embedded message to a member", async () => {
    const rows = await asActor(fixture.memberId, async (client) => {
      const result = await client.query(
        "SELECT message_id FROM rw_fn_copilot_context($1, $2::vector, NULL, 8)",
        [fixture.memberId, fakeEmbedding(0.002)],
      );
      return result.rows;
    });
    expect(rows.map((row) => row.message_id)).toContain(fixture.messageId);
  });

  test("rw_fn_copilot_context returns NOTHING for a non-member (the copilot cannot leak)", async () => {
    const rows = await asActor(fixture.outsiderId, async (client) => {
      const result = await client.query(
        "SELECT message_id FROM rw_fn_copilot_context($1, $2::vector, NULL, 8)",
        [fixture.outsiderId, fakeEmbedding(0.002)],
      );
      return result.rows;
    });
    expect(rows.length).toBe(0);
  });
});

describe("messages are never physically deleted", () => {
  test("DELETE is denied even for the message's own author", async () => {
    // Denied at two layers: rw_app has no DELETE grant on rw_messages at
    // all (260_grants.sql), so Postgres rejects with 42501 before RLS is
    // even consulted -- and there is no DELETE policy either. The row must
    // survive.
    expect(
      asActor(fixture.memberId, (client) =>
        client.query("DELETE FROM rw_messages WHERE id = $1", [fixture.messageId]),
      ),
    ).rejects.toMatchObject({ code: "42501" });

    const stillThere = await asActor(fixture.memberId, async (client) => {
      const result = await client.query("SELECT id FROM rw_messages WHERE id = $1", [fixture.messageId]);
      return result.rows;
    });
    expect(stillThere.length).toBe(1);
  });
});
