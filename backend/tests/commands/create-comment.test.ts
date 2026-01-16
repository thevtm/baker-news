import _ from "lodash";
import { expect } from "jsr:@std/expect";
import { spy } from "jsr:@std/testing/mock";

import { createCommands } from "../../src/commands/index.ts";
import { createQueries } from "../../src/queries/index.ts";
import { createEvents } from "../../src/events.ts";

import { InitializeDatabaseForTests } from "../helpers/db.ts";
import { disable_leaks_test_options } from "../helpers/disable-leaks-config.ts";

Deno.test("updates comment counters", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const events = createEvents();
  const queries = createQueries(db);
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

  const post_id = post_result.data!.id;

  // Create Comment 1
  const comment_1_result = await commands.createComment({
    authorId: user_id,
    postId: post_id,
    content: "Test Comment 1",
  });
  expect(comment_1_result.success).toBe(true);

  const comment_1_id = comment_1_result.data!.comment.id;

  // Create Comment 2
  const comment_2_result = await commands.createComment({
    authorId: user_id,
    parentCommentId: comment_1_id,
    content: "Test Comment 2",
  });
  expect(comment_2_result.success).toBe(true);

  const comment_2_id = comment_2_result.data!.comment.id;

  // Check Post
  const posts_query = await db.query.posts.findFirst({ where: (posts, { eq }) => eq(posts.id, post_id) });

  expect(posts_query).not.toBeNull();
  expect(posts_query!.commentsCount).toBe(2);

  // Check Comment 1
  const comments_query = await db.query.comments.findFirst({
    where: (comments, { eq }) => eq(comments.id, comment_1_id),
  });
  expect(comments_query).not.toBeNull();
  expect(comments_query!.commentsCount).toBe(1);

  await clear_db();
});
