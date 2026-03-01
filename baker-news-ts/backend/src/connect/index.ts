import type { ConnectRouter } from "@connectrpc/connect";

import { DBOrTx } from "../db/index.ts";
import { Events } from "../events/index.ts";
import { createQueries } from "../queries/index.ts";
import { createCommands } from "../commands/index.ts";
import { BakerNewsService } from "../proto/index.ts";

import { makeCreateUserRoute } from "./routes/create-user.ts";
import { makeGetCommentListRoute } from "./routes/get-comment-list.ts";
import { makeGetPostFeedRoute } from "./routes/get-post-feed.ts";
import { makeGetPostRoute } from "./routes/get-post.ts";
import { makeGetPostsFeedRoute } from "./routes/get-posts-feed.ts";
import { makeGetPostsRoute } from "./routes/get-posts.ts";
import { makeVoteCommentRoute } from "./routes/vote-comment.ts";
import { makeVotePostRoute } from "./routes/vote-post.ts";
import { makeCreatePostRoute } from "./routes/create-post.ts";
import { makeDeletePostRoute } from "./routes/delete-post.ts";
import { makeCreateCommentRoute } from "./routes/create-comment.ts";

export const createRoutes = (db: DBOrTx, events: Events) => {
  const queries = createQueries(db);
  const commands = createCommands(db, queries, events);

  return (router: ConnectRouter) =>
    router.service(BakerNewsService, {
      createUser: makeCreateUserRoute(commands),

      createPost: makeCreatePostRoute(db, commands),
      deletePost: makeDeletePostRoute(commands),

      createComment: makeCreateCommentRoute(db, commands),
      getCommentList: makeGetCommentListRoute(db),

      getPost: makeGetPostRoute(db),
      getPostFeed: makeGetPostFeedRoute(db, events),

      getPosts: makeGetPostsRoute(db),
      getPostsFeed: makeGetPostsFeedRoute(db, events),

      voteComment: makeVoteCommentRoute(commands),
      votePost: makeVotePostRoute(commands),
    });
};
