import { expect } from "jsr:@std/expect";
import { createClient, createRouterTransport } from "npm:@connectrpc/connect";

import { createCommands } from "../../../src/commands/index.ts";
import { createQueries } from "../../../src/queries/index.ts";
import { createRoutes } from "../../../src/connect/index.ts";
import * as proto from "../../../src/proto/index.ts";
import { createEvents } from "../../../src/events/index.ts";

import { InitializeDatabaseForTests } from "../../helpers/db.ts";
import { disable_leaks_test_options } from "../../helpers/disable-leaks-config.ts";

Deno.test("VoteComment", disable_leaks_test_options, async () => {
  const { db, clear_db } = await InitializeDatabaseForTests();

  const queries = createQueries(db);
  const events = createEvents(queries);
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

  const comment_data = await commands.createComment({
    postId: post_data.data!.post.id,
    authorId: user_id,
    content: "test_comment",
  });
  expect(comment_data.success).toBe(true);

  const routes = createRoutes(db, events);

  const transport = createRouterTransport(routes);
  const client = createClient(proto.BakerNewsService, transport);

  // Vote for the comment
  const vote_response = await client.voteComment({
    userId: user_id,
    commentId: comment_data.data!.comment.id,
    voteType: proto.VoteType.DOWN_VOTE,
  });

  expect(vote_response.result.case).toBe("success");

  // Check the updated score
  const updated_comment = await db.query.comments.findFirst({
    where: (comments, { eq }) => eq(comments.id, comment_data.data!.comment.id),
  });

  expect(updated_comment).not.toBeNull();
  expect(updated_comment!.score).toBe(-1);

  await clear_db();
});
