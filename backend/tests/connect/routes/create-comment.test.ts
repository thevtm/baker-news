import { expect } from "jsr:@std/expect";
import { createClient, createRouterTransport } from "npm:@connectrpc/connect";

import { createRoutes } from "../../../src/connect/index.ts";
import * as proto from "../../../src/proto/index.ts";
import { createEvents } from "../../../src/events/index.ts";
import { createQueries } from "../../../src/queries/index.ts";
import { createCommands } from "../../../src/commands/index.ts";

import { InitializeDatabaseForTests } from "../../helpers/db.ts";
import { disable_leaks_test_options } from "../../helpers/disable-leaks-config.ts";

Deno.test("CreateComment", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const events = createEvents(queries);
  const commands = createCommands(db, queries, events);
  const routes = createRoutes(db, events);

  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);

  // Create User
  const user_response = await commands.createUser({ username: "test_user" });
  expect(user_response.success).toBe(true);

  const user_id = user_response.data!.user!.id;

  // Create Post
  const post_response = await commands.createPost({ title: "Test Post", url: "http://example.com", authorId: user_id });
  expect(post_response.success).toBe(true);

  const post_id = post_response.data!.post!.id;

  // Make Request
  const response = await client.createComment({
    authorId: user_id,
    parent: { case: "postId", value: post_id },
    content: "Test Comment",
  });

  expect(response.result.case).toBe("success");
  expect(response.result.value).not.toBeNull();

  const successful_response = response.result.value as proto.CreateCommentSuccessfulResponse;

  expect(successful_response.comment).toBeDefined();
  expect(successful_response.comment!.content).toBe("Test Comment");
  expect(successful_response.comment!.postId).toBe(post_id);
  expect(successful_response.comment!.parentCommentId).toBeUndefined();
  expect(successful_response.comment!.author!.id).toBe(user_id);

  await clear_db();
});
