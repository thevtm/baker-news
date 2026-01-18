export * from "./types.ts";

import { DBOrTx } from "../db/db.ts";
import { Queries } from "../queries/index.ts";
import { Events } from "../events.ts";

import { createCreateUserCommand, CreateUserCommandFunction } from "./create-user.ts";
import { createCreatePostCommand, CreatePostCommandFunction } from "./create-post.ts";
import { createDeletePostCommand, DeletePostCommandFunction } from "./delete-post.ts";
import { CreateCommentCommandFunction, createCreateCommentCommand } from "./create-comment.ts";
import { createVotePostCommand, VotePostCommandFunction } from "./vote-post.ts";
import { createVoteCommentCommand, VoteCommentCommandFunction } from "./vote-comment.ts";

export type Commands = {
  createUser: CreateUserCommandFunction;
  createPost: CreatePostCommandFunction;
  deletePost: DeletePostCommandFunction;
  createComment: CreateCommentCommandFunction;
  votePost: VotePostCommandFunction;
  voteComment: VoteCommentCommandFunction;
};

export function createCommands(db: DBOrTx, queries: Queries, events: Events): Commands {
  return {
    createUser: createCreateUserCommand(db),
    createPost: createCreatePostCommand(db, queries, events),
    deletePost: createDeletePostCommand(db, events),
    createComment: createCreateCommentCommand(db, queries, events),
    votePost: createVotePostCommand(db, queries, events),
    voteComment: createVoteCommentCommand(db, queries, events),
  };
}
