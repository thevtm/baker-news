import { expect } from "jsr:@std/expect";
import { createClient, createRouterTransport } from "npm:@connectrpc/connect";

import { createCommands } from "../../../src/commands/index.ts";
import { createQueries } from "../../../src/queries/index.ts";
import { createRoutes } from "../../../src/connect/index.ts";
import { schema } from "../../../src/db/index.ts";
import * as proto from "../../../src/proto/index.ts";
import { createEvents } from "../../../src/events.ts";

import { InitializeDatabaseForTests } from "../../helpers/db.ts";
import { disable_leaks_test_options } from "../../helpers/disable-leaks-config.ts";

Deno.test("GetCommentList", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const events = createEvents();
  const queries = createQueries(db);
  const commands = createCommands(db, queries, events);

  // Create a user
  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);
  const user_id = user_data.data!.user.id;

  // Create a post
  const post_data = await commands.createPost({
    title: "test_post",
    url: "https://example.com",
    authorId: user_id,
  });
  expect(post_data.success).toBe(true);
  const post_id = post_data.data!.id;

  // Create comments
  const comment_data_1 = await commands.createComment({
    postId: post_id,
    authorId: user_id,
    content: "test_comment 1",
  });
  expect(comment_data_1.success).toBe(true);
  const comment_id_1 = comment_data_1.data!.id;

  const comment_data_2 = await commands.createComment({
    parentCommentId: comment_id_1,
    authorId: user_id,
    content: "test_comment 2",
  });
  expect(comment_data_2.success).toBe(true);
  const comment_id_2 = comment_data_2.data!.id;

  // Vote for comments
  const vote_comment_1 = await commands.voteComment({
    userId: user_id,
    commentId: comment_id_1,
    voteType: schema.VoteType.UP_VOTE,
  });
  expect(vote_comment_1.success).toBe(true);

  // Set up the routes and transport
  const routes = createRoutes(db, events);
  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);

  // Make the request
  const response = await client.getCommentList({ postId: post_id, userId: user_id });
  expect(response.result.case).toBe("success");

  const comment_list = (response.result.value! as proto.GetCommentListSuccessfulResponse).commentList!;

  expect(comment_list.comments.length).toBe(2);

  expect(comment_list.comments[0].id).toBe(comment_id_1);
  expect(comment_list.comments[0].content).toBe("test_comment 1");
  expect(comment_list.comments[0].author!.id).toBe(user_id);
  expect(comment_list.comments[0].postId).toBe(post_id);
  expect(comment_list.comments[0].score).toBe(1);
  expect(comment_list.comments[0].vote).toBeDefined();
  expect(comment_list.comments[0].vote!.userId).toBe(user_id);

  expect(comment_list.comments[1].id).toBe(comment_id_2);
  expect(comment_list.comments[1].content).toBe("test_comment 2");
  expect(comment_list.comments[1].author!.id).toBe(user_id);
  expect(comment_list.comments[1].postId).toBe(post_id);
  expect(comment_list.comments[1].score).toBe(0);
  expect(comment_list.comments[1].vote).not.toBeDefined();

  // Clean up
  await clear_db();
});
