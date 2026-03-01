import { expect } from "jsr:@std/expect";
import { createClient, createRouterTransport } from "npm:@connectrpc/connect";

import { createCommands } from "../../../src/commands/index.ts";
import { createQueries } from "../../../src/queries/index.ts";
import { createRoutes } from "../../../src/connect/index.ts";
import { schema } from "../../../src/db/index.ts";
import * as proto from "../../../src/proto/index.ts";
import { createEvents } from "../../../src/events/index.ts";

import { InitializeDatabaseForTests } from "../../helpers/db.ts";
import { disable_leaks_test_options } from "../../helpers/disable-leaks-config.ts";

Deno.test("GetPostFeed", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const events = createEvents(queries);
  const commands = createCommands(db, queries, events);

  const routes = createRoutes(db, events);
  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);

  // Create a user
  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);
  const user_id = user_data.data!.user.id;

  // Create posts
  const post_data = await commands.createPost({
    title: "test_post 1",
    url: "https://example.com",
    authorId: user_id,
  });
  expect(post_data.success).toBe(true);
  const post_id = post_data.data!.post.id;

  // Make request for the initial post list
  const feed = client.getPostFeed({ userId: user_id, postId: post_id });
  const iterator = feed[Symbol.asyncIterator]();

  let response_it = await iterator.next();
  expect(response_it.done).toBe(false);

  const response_initial_posts = response_it.value as proto.GetPostFeedResponse;

  expect(response_initial_posts.result).toBeDefined();
  expect(response_initial_posts.result.case).toBe("success");

  const successful_posts_response = response_initial_posts.result.value as proto.GetPostFeedSuccessfulResponse;
  expect(successful_posts_response.event.case).toBe("initialPost");

  const initial_post = successful_posts_response.event.value as proto.Post;
  expect(initial_post).toBeDefined();
  expect(initial_post.title).toBe("test_post 1");
  expect(initial_post.score).toBe(0);

  // Vote for the first post
  const vote_post_promise = commands
    .votePost({
      userId: user_id,
      postId: post_data.data!.post.id,
      voteType: schema.VoteType.UP_VOTE,
    })
    .then((vote_post_response) => {
      expect(vote_post_response.success).toBe(true);
    });

  // Check the event
  response_it = await iterator.next();
  await vote_post_promise;

  expect(response_it.done).toBe(false);

  const response_user_voted_post = response_it.value as proto.GetPostsFeedResponse;
  expect(response_user_voted_post.result).toBeDefined();
  expect(response_user_voted_post.result.case).toBe("success");

  const successful_vote_response = response_user_voted_post.result.value as proto.GetPostsFeedSuccessfulResponse;
  expect(successful_vote_response.event.case).toBe("userVotedPost");

  const post_score_changed_event = successful_vote_response.event.value as proto.UserVotedPost;
  expect(post_score_changed_event.vote?.postId).toBe(post_data.data!.post.id);
  expect(post_score_changed_event.newScore).toBe(1);

  await clear_db();
});
