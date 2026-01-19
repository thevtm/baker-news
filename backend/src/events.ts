import { Subject } from "rxjs";

import { schema } from "./db/index.ts";

export interface Event {
  type: EventType;
  data: EventData;
}

export enum EventType {
  USER_CREATED_POST = "user_created_post",
  USER_DELETED_POST = "user_deleted_post",
  USER_VOTED_POST = "user_voted_post",
  USER_CREATED_COMMENT = "user_created_comment",
  USER_VOTED_COMMENT = "user_voted_comment",
}

export type EventData =
  | UserCreatedCommentEventData
  | UserDeletedPostEventData
  | UserCreatedPostEventData
  | UserVotedCommentEventData
  | UserVotedPostEventData;

export interface UserCreatedPostEventData {
  post: typeof schema.posts.$inferSelect;
  author: typeof schema.users.$inferSelect;
}

export interface UserDeletedPostEventData {
  post: typeof schema.posts.$inferSelect;
}

export interface UserVotedPostEventData {
  postVote: typeof schema.postVotes.$inferSelect;
  post: typeof schema.posts.$inferSelect;
}

export interface UserCreatedCommentEventData {
  comment: typeof schema.comments.$inferSelect;
  author: typeof schema.users.$inferSelect;
}

export interface UserVotedCommentEventData {
  commentVote: typeof schema.commentVotes.$inferSelect;
  comment: typeof schema.comments.$inferSelect;
}

export type Events = {
  subject: Subject<Event>;
  dispatch(event: Event): void;
};

export function createEvents(): Events {
  const subject = new Subject<Event>();

  return {
    subject,
    dispatch(event: Event) {
      subject.next(event);
    },
  };
}
