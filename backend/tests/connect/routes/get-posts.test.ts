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

Deno.test("GetPosts", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const events = createEvents();
  const queries = createQueries(db);
  const commands = createCommands(db, queries, events);

  // Create a user
  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);
  const user_id = user_data.data!.user.id;

  // Create posts
  const post_data_1 = await commands.createPost({
    title: "test_post 1",
    url: "https://example.com",
    authorId: user_id,
  });
  expect(post_data_1.success).toBe(true);

  const post_data_2 = await commands.createPost({
    title: "test_post 2",
    url: "https://foobar.com",
    authorId: user_id,
  });
  expect(post_data_2.success).toBe(true);

  // Vote for the first post
  const vote_post_1 = await commands.votePost({
    userId: user_id,
    postId: post_data_1.data!.post.id,
    voteType: schema.VoteType.UP_VOTE,
  });
  expect(vote_post_1.success).toBe(true);

  // Make request
  const routes = createRoutes(db, events);

  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);
  const response = (await client.getPosts({ userId: user_id })) as proto.GetPostsResponse;

  expect(response.result.case).toBe("success");

  const post_list = (response.result.value! as proto.GetPostsSuccessfulResponse).postList!;

  expect(post_list.posts.length).toBe(2);

  expect(post_list.posts[0].title).toBe("test_post 1");
  expect(post_list.posts[0].url).toBe("https://example.com");
  expect(post_list.posts[0].author!.username).toBe("test_user");
  expect(post_list.posts[0].score).toBe(1);

  expect(post_list.posts[0].vote).toBeDefined();
  expect(post_list.posts[0].vote!.postId).toBe(post_data_1.data!.post.id);
  expect(post_list.posts[0].vote!.userId).toBe(user_id);
  expect(post_list.posts[0].vote!.voteType).toBe(proto.VoteType.UP_VOTE);
  expect(post_list.posts[0].vote!.createdAt).toBeDefined();
  expect(post_list.posts[0].vote!.updatedAt).toBeDefined();

  expect(post_list.posts[1].title).toBe("test_post 2");
  expect(post_list.posts[1].url).toBe("https://foobar.com");
  expect(post_list.posts[1].author!.username).toBe("test_user");
  expect(post_list.posts[1].score).toBe(0);
  expect(post_list.posts[1].vote).toBeUndefined();

  await clear_db();
});
