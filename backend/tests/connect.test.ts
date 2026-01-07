import { expect } from "jsr:@std/expect";
import { createClient, createRouterTransport } from "npm:@connectrpc/connect";

import { createCommands } from "../src/commands/index.ts";
import { createQueries } from "../src/queries/index.ts";
import {
  BakerNewsService,
  CreateUserSuccessfulResponse,
  GetPostListResponse,
  GetPostListSuccessfulResponse,
  VoteType,
} from "../src/proto/index.ts";

import { createRoutes } from "../src/connect.ts";

import { InitializeDatabaseForTests } from "./helpers/db.ts";
import { disable_leaks_test_options } from "./helpers/disable-leaks-config.ts";

Deno.test("CreateUser", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const routes = createRoutes(db);

  const transport = createRouterTransport(routes);
  const client = createClient(BakerNewsService, transport);

  const response = await client.createUser({ username: "test_user" });

  expect(response.result.case).toBe("success");
  expect(response.result.value).not.toBeNull();

  const value = response.result.value as CreateUserSuccessfulResponse;

  expect(value.id).toBeDefined();

  await clear_db();
});

Deno.test("GetPostList", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const commands = createCommands(db, queries);

  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);

  const post_data_1 = await commands.createPost({
    title: "test_post 1",
    url: "https://example.com",
    authorId: user_data.data!.id,
  });
  expect(post_data_1.success).toBe(true);

  const post_data_2 = await commands.createPost({
    title: "test_post 2",
    url: "https://foobar.com",
    authorId: user_data.data!.id,
  });
  expect(post_data_2.success).toBe(true);

  const routes = createRoutes(db);

  const transport = createRouterTransport(routes);
  const client = createClient(BakerNewsService, transport);
  const response = (await client.getPostList({})) as GetPostListResponse;

  expect(response.result.case).toBe("success");

  const post_list = (response.result.value! as GetPostListSuccessfulResponse).postList!;

  expect(post_list.Posts.length).toBe(2);

  expect(post_list.Posts[0].title).toBe("test_post 1");
  expect(post_list.Posts[0].url).toBe("https://example.com");
  expect(post_list.Posts[0].author!.username).toBe("test_user");

  expect(post_list.Posts[1].title).toBe("test_post 2");
  expect(post_list.Posts[1].url).toBe("https://foobar.com");
  expect(post_list.Posts[1].author!.username).toBe("test_user");

  await clear_db();
});

Deno.test("VotePost", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const commands = createCommands(db, queries);

  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);

  const post_data = await commands.createPost({
    title: "test_post",
    url: "https://example.com",
    authorId: user_data.data!.id,
  });
  expect(post_data.success).toBe(true);

  const routes = createRoutes(db);

  const transport = createRouterTransport(routes);
  const client = createClient(BakerNewsService, transport);

  // Vote for the post
  const vote_response = await client.votePost({
    userId: user_data.data!.id,
    postId: post_data.data!.id,
    voteType: VoteType.UP_VOTE,
  });

  expect(vote_response.result.case).toBe("success");

  // Check the updated score
  const updated_post = await db.query.posts.findFirst({
    where: (posts, { eq }) => eq(posts.id, post_data.data!.id),
  });

  expect(updated_post).not.toBeNull();
  expect(updated_post!.score).toBe(1);

  await clear_db();
});

Deno.test("VoteComment", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const commands = createCommands(db, queries);

  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);

  const post_data = await commands.createPost({
    title: "test_post",
    url: "https://example.com",
    authorId: user_data.data!.id,
  });
  expect(post_data.success).toBe(true);

  const comment_data = await commands.createComment({
    postId: post_data.data!.id,
    authorId: user_data.data!.id,
    content: "test_comment",
  });
  expect(comment_data.success).toBe(true);

  const routes = createRoutes(db);

  const transport = createRouterTransport(routes);
  const client = createClient(BakerNewsService, transport);

  // Vote for the comment
  const vote_response = await client.voteComment({
    userId: user_data.data!.id,
    commentId: comment_data.data!.id,
    voteType: VoteType.DOWN_VOTE,
  });

  expect(vote_response.result.case).toBe("success");

  // Check the updated score
  const updated_comment = await db.query.comments.findFirst({
    where: (comments, { eq }) => eq(comments.id, comment_data.data!.id),
  });

  expect(updated_comment).not.toBeNull();
  expect(updated_comment!.score).toBe(-1);

  await clear_db();
});
