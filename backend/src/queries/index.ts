import { DBOrTx } from "../db/index.ts";

import { createUserExistQuery, UserExistsQueryFunction } from "./user-exists.ts";
import { createPostExistsQuery, PostExistsQueryFunction } from "./post-exists.ts";
import { CommentExistsQueryFunction, createCommentExistsQuery } from "./comment-exists.ts";

export * from "./types.ts";

export type Queries = {
  userExists: UserExistsQueryFunction;
  postExists: PostExistsQueryFunction;
  commentsExists: CommentExistsQueryFunction;
};

export function createQueries(db: DBOrTx): Queries {
  return {
    userExists: createUserExistQuery(db),
    postExists: createPostExistsQuery(db),
    commentsExists: createCommentExistsQuery(db),
  };
}
