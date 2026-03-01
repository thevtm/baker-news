import invariant from "tiny-invariant";
import { create } from "@bufbuild/protobuf";

import { schema } from "../db/index.ts";
import * as proto from "../proto/index.ts";

export const USER_ROLE_MAP = new Map<schema.UserRoles | undefined, proto.UserRole>([
  [undefined, proto.UserRole.UNSPECIFIED],
  [schema.UserRoles.GUEST, proto.UserRole.GUEST],
  [schema.UserRoles.USER, proto.UserRole.USER],
  [schema.UserRoles.ADMIN, proto.UserRole.ADMIN],
]);

export const PROTO_TO_SCHEMA_VOTE_TYPE_MAP = new Map<proto.VoteType, schema.VoteType>([
  [proto.VoteType.NO_VOTE, schema.VoteType.NO_VOTE],
  [proto.VoteType.UP_VOTE, schema.VoteType.UP_VOTE],
  [proto.VoteType.DOWN_VOTE, schema.VoteType.DOWN_VOTE],
]);

export const SCHEMA_TO_PROTO_VOTE_TYPE_MAP = new Map<schema.VoteType, proto.VoteType>([
  [schema.VoteType.NO_VOTE, proto.VoteType.NO_VOTE],
  [schema.VoteType.UP_VOTE, proto.VoteType.UP_VOTE],
  [schema.VoteType.DOWN_VOTE, proto.VoteType.DOWN_VOTE],
]);

export function map_post(db_post: typeof schema.posts.$inferSelect): proto.Post {
  return create(proto.PostSchema, {
    id: db_post.id,
    title: db_post.title,
    url: db_post.url,
    score: db_post.score,
    commentCount: db_post.commentsCount,
    comments: undefined,
    createdAt: proto.convert_date_to_proto_timestamp(db_post.createdAt),
    updatedAt: proto.convert_date_to_proto_timestamp(db_post.updatedAt),
  });
}

export function map_post_vote(db_vote: typeof schema.postVotes.$inferSelect): proto.PostVote {
  return create(proto.PostVoteSchema, {
    id: db_vote.userId,
    postId: db_vote.postId,
    userId: db_vote.userId,
    voteType: SCHEMA_TO_PROTO_VOTE_TYPE_MAP.get(db_vote.voteType),
    createdAt: proto.convert_date_to_proto_timestamp(db_vote.createdAt),
    updatedAt: proto.convert_date_to_proto_timestamp(db_vote.updatedAt),
  });
}

export function map_post_votes(post_vote: (typeof schema.postVotes.$inferSelect)[]): proto.PostVote | undefined {
  invariant(post_vote.length <= 1);

  if (post_vote.length === 0) {
    return undefined;
  }

  return map_post_vote(post_vote[0]);
}

export function map_comment(db_comment: typeof schema.comments.$inferSelect): proto.Comment {
  return create(proto.CommentSchema, {
    id: db_comment.id,
    postId: db_comment.postId,
    parentCommentId: db_comment.parentCommentId ?? undefined,
    content: db_comment.content,
    score: db_comment.score,
    commentCount: db_comment.commentsCount,
    createdAt: proto.convert_date_to_proto_timestamp(db_comment.createdAt),
    updatedAt: proto.convert_date_to_proto_timestamp(db_comment.updatedAt),
  });
}

export function map_comment_vote(comment_vote: typeof schema.commentVotes.$inferSelect): proto.CommentVote {
  return create(proto.CommentVoteSchema, {
    id: comment_vote.userId,
    commentId: comment_vote.commentId,
    userId: comment_vote.userId,
    voteType: SCHEMA_TO_PROTO_VOTE_TYPE_MAP.get(comment_vote.voteType),
    createdAt: proto.convert_date_to_proto_timestamp(comment_vote.createdAt),
    updatedAt: proto.convert_date_to_proto_timestamp(comment_vote.updatedAt),
  });
}

export function map_user(db_user: typeof schema.users.$inferSelect): proto.User {
  return create(proto.UserSchema, {
    id: db_user.id,
    username: db_user.username,
    role: USER_ROLE_MAP.get(db_user.role),
    createdAt: proto.convert_date_to_proto_timestamp(db_user.createdAt),
    updatedAt: proto.convert_date_to_proto_timestamp(db_user.updatedAt),
  });
}
