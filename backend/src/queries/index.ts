import { DBOrTx } from "../db/index.ts";

import { createUserExistQuery, UserExistsQueryFunction } from "./user-exists.ts";
import { createPostExistsQuery, PostExistsQueryFunction } from "./post-exists.ts";
import { CommentExistsQueryFunction, createCommentExistsQuery } from "./comment-exists.ts";
import * as pgmq from "./pgmq.ts";

export * from "./types.ts";

export type Queries = {
  userExists: UserExistsQueryFunction;
  postExists: PostExistsQueryFunction;
  commentsExists: CommentExistsQueryFunction;

  // PGMQ
  pgmqCreateQueue: pgmq.PGMQCreateQueueQueryFunction;
  pgmqSendMessage: pgmq.PGMQSendMessageQueryFunction;
  pgmqReadMessage: pgmq.PGMQReadMessageQueryFunction;
  pgmqReadMessageWithPoll: pgmq.PGMQReadMessageWithPollQueryFunction;
  pgmqDeleteMessage: pgmq.PGMQDeleteMessageQueryFunction;
  pgmqArchiveMessage: pgmq.PGMQArchiveMessageQueryFunction;
};

export function createQueries(db: DBOrTx): Queries {
  return {
    userExists: createUserExistQuery(db),
    postExists: createPostExistsQuery(db),
    commentsExists: createCommentExistsQuery(db),

    // PGMQ
    pgmqCreateQueue: pgmq.makePGMQCreateQueueQuery(db),
    pgmqSendMessage: pgmq.makePGMQSendMessageQuery(db),
    pgmqReadMessage: pgmq.makePGMQReadMessageQuery(db),
    pgmqReadMessageWithPoll: pgmq.makePGMQReadMessageWithPollQuery(db),
    pgmqDeleteMessage: pgmq.makePGMQDeleteMessageQuery(db),
    pgmqArchiveMessage: pgmq.makePGMQArchiveMessageQuery(db),
  };
}
