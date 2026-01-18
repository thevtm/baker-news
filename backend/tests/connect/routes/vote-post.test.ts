import { expect } from "jsr:@std/expect";
import { createClient, createRouterTransport } from "npm:@connectrpc/connect";

import { createCommands } from "../../../src/commands/index.ts";
import { createQueries } from "../../../src/queries/index.ts";
import { createRoutes } from "../../../src/connect/index.ts";
import * as proto from "../../../src/proto/index.ts";
import { createEvents } from "../../../src/events.ts";

import { InitializeDatabaseForTests } from "../../helpers/db.ts";
import { disable_leaks_test_options } from "../../helpers/disable-leaks-config.ts";

Deno.test("VotePost", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const events = createEvents();
  const queries = createQueries(db);
  const commands = createCommands(db, queries, events);

  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);
  const user_id = user_data.data!.user.id;

  const post_data = await commands.createPost({
    title: "test_post",
    url: "https://example.com",
    authorId: user_id,
  });
  expect(post_data.success).toBe(true);
  const post_id = post_data.data!.post.id;

  const routes = createRoutes(db, events);

  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);

  // Vote for the post
  const vote_response = await client.votePost({
    userId: user_id,
    postId: post_id,
    voteType: proto.VoteType.UP_VOTE,
  });

  expect(vote_response.result.case).toBe("success");
  expect(vote_response.result.value).not.toBeNull();

  const value = vote_response.result.value as proto.VotePostSuccessfulResponse;

  expect(value.newScore).toBe(1);
  expect(value.vote).toBeDefined();
  expect(value.vote!.postId).toBe(post_id);
  expect(value.vote!.userId).toBe(user_id);
  expect(value.vote!.voteType).toBe(proto.VoteType.UP_VOTE);
  expect(value.vote!.createdAt).toBeDefined();
  expect(value.vote!.updatedAt).toBeDefined();

  // Check the updated score
  const updated_post = await db.query.posts.findFirst({
    where: (posts, { eq }) => eq(posts.id, post_id),
  });

  expect(updated_post).not.toBeNull();
  expect(updated_post!.score).toBe(1);

  await clear_db();
});
