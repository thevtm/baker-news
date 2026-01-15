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

Deno.test("GetPost", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const events = createEvents();
  const queries = createQueries(db);
  const commands = createCommands(db, queries, events);

  // Create a user
  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);
  const user_id = user_data.data!.user.id;

  // Create a post
  const post_data = await commands.createPost({ title: "test_post", url: "https://example.com", authorId: user_id });
  expect(post_data.success).toBe(true);
  const post_id = post_data.data!.id;

  // Create a comment
  const comment_data = await commands.createComment({ postId: post_id, authorId: user_id, content: "test_comment" });
  expect(comment_data.success).toBe(true);
  const comment_id = comment_data.data!.comment.id;

  // Vote for the post
  const vote_post = await commands.votePost({ userId: user_id, postId: post_id, voteType: schema.VoteType.UP_VOTE });
  expect(vote_post.success).toBe(true);

  // Vote for the comment
  const vote_comment = await commands.voteComment({
    userId: user_id,
    commentId: comment_id,
    voteType: schema.VoteType.UP_VOTE,
  });
  expect(vote_comment.success).toBe(true);

  // Set up the routes and transport
  const routes = createRoutes(db, events);
  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);

  // Make the request
  const response = await client.getPost({ postId: post_id, userId: user_id });

  expect(response.result.case).toBe("success");

  // Check Post
  const post = (response.result.value! as proto.GetPostSuccessfulResponse).post!;

  expect(post.id).toBe(post_id);
  expect(post.title).toBe("test_post");
  expect(post.url).toBe("https://example.com");
  expect(post.author!.id).toBe(user_id);
  expect(post.score).toBe(1);

  expect(post.vote).toBeDefined();
  expect(post.vote!.userId).toBe(user_id);
  expect(post.vote!.postId).toBe(post_id);
  expect(post.vote!.voteType).toBe(proto.VoteType.UP_VOTE);

  // Check comments

  const comments = post.comments?.comments;

  expect(comments).toBeDefined();
  expect(comments!.length).toBe(1);

  expect(comments![0].id).toBe(comment_id);
  expect(comments![0].content).toBe("test_comment");
  expect(comments![0].author!.id).toBe(user_id);
  expect(comments![0].postId).toBe(post_id);
  expect(comments![0].score).toBe(1);

  expect(comments![0].vote).toBeDefined();
  expect(comments![0].vote!.userId).toBe(user_id);
  expect(comments![0].vote!.commentId).toBe(comment_id);
  expect(comments![0].vote!.voteType).toBe(proto.VoteType.UP_VOTE);

  // Clean up
  await clear_db();
});
