export * from "./types.ts";

import { DBOrTx } from "../db/db.ts";
import { Queries } from "../queries/index.ts";

import { createCreateUserCommand, CreateUserCommandFunction } from "./create-user.ts";
import { createCreatePostCommand, CreatePostCommandFunction } from "./create-posts.ts";
import { CreateCommentCommandFunction, createCreateCommentCommand } from "./create-comment.ts";
import { createVotePostCommand, VotePostCommandFunction } from "./vote-post.ts";
import { createVoteCommentCommand, VoteCommentCommandFunction } from "./vote-comment.ts";

export type Commands = {
  createUser: CreateUserCommandFunction;
  createPost: CreatePostCommandFunction;
  createComment: CreateCommentCommandFunction;
  votePost: VotePostCommandFunction;
  voteComment: VoteCommentCommandFunction;
};

export function createCommands(db: DBOrTx, queries: Queries): Commands {
  return {
    createUser: createCreateUserCommand(db),
    createPost: createCreatePostCommand(db, queries),
    createComment: createCreateCommentCommand(db, queries),
    votePost: createVotePostCommand(db, queries),
    voteComment: createVoteCommentCommand(db, queries),
  };
}
