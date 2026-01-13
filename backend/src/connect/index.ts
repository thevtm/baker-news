import type { ConnectRouter } from "@connectrpc/connect";

import { DBOrTx } from "../db/index.ts";
import { Events } from "../events.ts";
import { createQueries } from "../queries/index.ts";
import { createCommands } from "../commands/index.ts";
import { BakerNewsService } from "../proto/index.ts";

import { makeCreateUserRoute } from "./routes/create-user.ts";
import { makeGetPostsRoute } from "./routes/get-posts.ts";
import { makeGetPostsFeedRoute } from "./routes/get-posts-feed.ts";
import { makeGetCommentListRoute } from "./routes/get-comment-list.ts";
import { makeVotePostRoute } from "./routes/vote-post.ts";
import { makeVoteCommentRoute } from "./routes/vote-comment.ts";
import { makeGetPostRoute } from "./routes/get-post.ts";

export const createRoutes = (db: DBOrTx, events: Events) => {
  const queries = createQueries(db);
  const commands = createCommands(db, queries, events);

  return (router: ConnectRouter) =>
    router.service(BakerNewsService, {
      createUser: makeCreateUserRoute(commands),
      getPosts: makeGetPostsRoute(db),
      getPostsFeed: makeGetPostsFeedRoute(db, events),
      getPost: makeGetPostRoute(db),
      getCommentList: makeGetCommentListRoute(db),
      votePost: makeVotePostRoute(commands),
      voteComment: makeVoteCommentRoute(commands),
    });
};
