import { expect } from "jsr:@std/expect";
import { createClient, createRouterTransport } from "npm:@connectrpc/connect";

import { createRoutes } from "../../../src/connect/index.ts";
import * as proto from "../../../src/proto/index.ts";
import { createEvents } from "../../../src/events/index.ts";
import { createQueries } from "../../../src/queries/index.ts";
import { createCommands } from "../../../src/commands/index.ts";

import { InitializeDatabaseForTests } from "../../helpers/db.ts";
import { disable_leaks_test_options } from "../../helpers/disable-leaks-config.ts";

Deno.test("CreatePost", disable_leaks_test_options, async () => {
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

  // Make Request
  const response = await client.createPost({ title: "Test Post", url: "http://example.com", authorId: user_id });

  expect(response.result.case).toBe("success");
  expect(response.result.value).not.toBeNull();

  const successful_response = response.result.value as proto.CreatePostSuccessfulResponse;

  expect(successful_response.post).toBeDefined();
  expect(successful_response.post!.id).toBeDefined();
  expect(successful_response.post!.title).toBe("Test Post");
  expect(successful_response.post!.url).toBe("http://example.com");
  expect(successful_response.post!.author!.id).toBe(user_id);
  expect(successful_response.post!.createdAt).toBeDefined();
  expect(successful_response.post!.updatedAt).toBeDefined();
  expect(successful_response.post!.score).toBe(0);
  expect(successful_response.post!.commentCount).toBe(0);

  await clear_db();
});
