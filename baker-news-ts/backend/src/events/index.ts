import { Subject } from "rxjs";

import { Queries } from "../queries/index.ts";

import { Event } from "./application.ts";
import { EmitUserVotedPostFunction, makeEmitUserVotedPostEvent } from "./user-voted-post-event.ts";
import { EmitUserCreatedPostFunction, makeEmitUserCreatedPostEvent } from "./user-created-post-event.ts";
import { EmitUserDeletedPostFunction, makeEmitUserDeletedPostEvent } from "./user-deleted-post-event.ts";
import { EmitUserCreatedCommentFunction, makeEmitUserCreatedCommentEvent } from "./user-created-comment-event.ts";
import { EmitUserVotedCommentFunction, makeEmitUserVotedCommentEvent } from "./user-voted-comment-event.ts";

export * from "./application.ts";
export * from "./worker.ts";

export type Events = {
  subject: Subject<Event>;
  dispatch(event: Event): void;

  emitUserCreatedPost: EmitUserCreatedPostFunction;
  emitUserDeletedPost: EmitUserDeletedPostFunction;
  emitUserVotedPost: EmitUserVotedPostFunction;
  emitUserCreatedComment: EmitUserCreatedCommentFunction;
  emitUserVotedComment: EmitUserVotedCommentFunction;
};

export function createEvents(queries: Queries): Events {
  const subject = new Subject<Event>();

  return {
    subject: subject,
    dispatch(event: Event) {
      subject.next(event);
    },

    emitUserCreatedPost: makeEmitUserCreatedPostEvent(queries),
    emitUserDeletedPost: makeEmitUserDeletedPostEvent(queries),
    emitUserVotedPost: makeEmitUserVotedPostEvent(queries),
    emitUserCreatedComment: makeEmitUserCreatedCommentEvent(queries),
    emitUserVotedComment: makeEmitUserVotedCommentEvent(queries),
  };
}
