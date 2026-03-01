export const QUEUE_NAME = "event_queue";

export enum EventTypePO {
  USER_CREATED_POST = "user_created_post",
  USER_DELETED_POST = "user_deleted_post",
  USER_VOTED_POST = "user_voted_post",
  USER_CREATED_COMMENT = "user_created_comment",
  USER_VOTED_COMMENT = "user_voted_comment",
}

export type EventDataPO =
  | UserVotedPostEventPOData
  | UserCreatedPostEventPOData
  | UserDeletedPostEventPOData
  | UserCreatedCommentEventPOData
  | UserVotedCommentEventPOData;

export interface EventPO {
  type: EventTypePO;
  data: EventDataPO;
}

export interface UserCreatedPostEventPOData {
  postId: number;
  authorId: number;
}

export interface UserDeletedPostEventPOData {
  postId: number;
}

export interface UserVotedPostEventPOData {
  postVoteId: number;

  postId: number;
  userId: number;
}

export interface UserCreatedCommentEventPOData {
  commentId: number;
  authorId: number;
}

export interface UserVotedCommentEventPOData {
  commentVoteId: number;
  commentId: number;
  userId: number;
}
