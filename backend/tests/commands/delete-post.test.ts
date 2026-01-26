import _ from "lodash";
import { expect } from "jsr:@std/expect";
import { spy } from "jsr:@std/testing/mock";

import { createCommands } from "../../src/commands/index.ts";
import { createQueries } from "../../src/queries/index.ts";
import { createEvents, EventType } from "../../src/events/index.ts";

import { InitializeDatabaseForTests } from "../helpers/db.ts";
import { disable_leaks_test_options } from "../helpers/disable-leaks-config.ts";

Deno.test("deletes post", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const events = createEvents(queries);
  const commands = createCommands(db, queries, events);

  // Spy on events
  const events_spy = spy();
  events.subject.subscribe(events_spy);

  // Create User
  const user_result = await commands.createUser({ username: "testuser" });
  expect(user_result.success).toBe(true);

  const user_id = user_result.data!.user!.id;

  // Create Post
  const post_result = await commands.createPost({
    title: "Test Post",
    url: "https://example.com",
    authorId: user_id,
  });
  expect(post_result.success).toBe(true);

  const post_id = post_result.data!.post.id;

  // Delete Post
  const delete_result = await commands.deletePost({ postId: post_id });

  expect(delete_result.success).toBe(true);
  expect(delete_result.data!.post.id).toBe(post_id);
  expect(delete_result.data!.post.deletedAt).not.toBeNull();

  // Check if event was emitted
  const event = _.last(events_spy.calls)!.args[0] as Event;
  expect(event.type).toBe(EventType.USER_DELETED_POST);

  await clear_db();
});
