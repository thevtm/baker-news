import { expect } from "jsr:@std/expect";
import { createClient, createRouterTransport } from "npm:@connectrpc/connect";

import { createCommands } from "../src/commands/index.ts";
import { createQueries } from "../src/queries/index.ts";
import { createRoutes } from "../src/connect.ts";
import { schema } from "../src/db/index.ts";
import * as proto from "../src/proto/index.ts";

import { InitializeDatabaseForTests } from "./helpers/db.ts";
import { disable_leaks_test_options } from "./helpers/disable-leaks-config.ts";

Deno.test("CreateUser", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const routes = createRoutes(db);

  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);

  const response = await client.createUser({ username: "test_user" });

  expect(response.result.case).toBe("success");
  expect(response.result.value).not.toBeNull();

  const value = response.result.value as proto.CreateUserSuccessfulResponse;

  expect(value.user).toBeDefined();

  await clear_db();
});

Deno.test("GetPostList", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const commands = createCommands(db, queries);

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
    postId: post_data_1.data!.id,
    voteType: schema.VoteType.UP_VOTE,
  });
  expect(vote_post_1.success).toBe(true);

  // Make request
  const routes = createRoutes(db);

  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);
  const response = (await client.getPosts({ userId: user_id })) as proto.GetPostsResponse;

  expect(response.result.case).toBe("success");

  const post_list = (response.result.value! as proto.GetPostListSuccessfulResponse).postList!;

  expect(post_list.posts.length).toBe(2);

  expect(post_list.posts[0].title).toBe("test_post 1");
  expect(post_list.posts[0].url).toBe("https://example.com");
  expect(post_list.posts[0].author!.username).toBe("test_user");
  expect(post_list.posts[0].score).toBe(1);

  expect(post_list.posts[0].vote).toBeDefined();
  expect(post_list.posts[0].vote!.postId).toBe(post_data_1.data!.id);
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

Deno.test("GetPost", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const commands = createCommands(db, queries);

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
  const comment_id = comment_data.data!.id;

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
  const routes = createRoutes(db);
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

Deno.test("GetCommentList", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();
  const queries = createQueries(db);
  const commands = createCommands(db, queries);

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
  const routes = createRoutes(db);
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

Deno.test("VotePost", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const commands = createCommands(db, queries);

  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);
  const user_id = user_data.data!.user.id;

  const post_data = await commands.createPost({
    title: "test_post",
    url: "https://example.com",
    authorId: user_id,
  });
  expect(post_data.success).toBe(true);
  const post_id = post_data.data!.id;

  const routes = createRoutes(db);

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

Deno.test("VoteComment", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const commands = createCommands(db, queries);

  const user_data = await commands.createUser({ username: "test_user" });
  expect(user_data.success).toBe(true);
  const user_id = user_data.data!.user.id;

  const post_data = await commands.createPost({
    title: "test_post",
    url: "https://example.com",
    authorId: user_id,
  });
  expect(post_data.success).toBe(true);

  const comment_data = await commands.createComment({
    postId: post_data.data!.id,
    authorId: user_id,
    content: "test_comment",
  });
  expect(comment_data.success).toBe(true);

  const routes = createRoutes(db);

  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);

  // Vote for the comment
  const vote_response = await client.voteComment({
    userId: user_id,
    commentId: comment_data.data!.id,
    voteType: proto.VoteType.DOWN_VOTE,
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
