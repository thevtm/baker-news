import { DBOrTx } from "../db/index.ts";
import { ApplicationError } from "../error.ts";
import { Queries } from "../queries/index.ts";

import { EventPO, EventTypePO, UserVotedCommentEventPOData, QUEUE_NAME } from "./persisted.ts";

export type EmitUserVotedCommentFunction = (
  commentVoteId: number,

  commentId: number,
  userId: number,

  tx?: DBOrTx
) => Promise<void>;

export function makeEmitUserVotedCommentEvent(queries: Queries): EmitUserVotedCommentFunction {
  return async (commentVoteId, commentId, userId, tx) => {
    const event_data: UserVotedCommentEventPOData = { commentVoteId, commentId, userId };
    const event: EventPO = { type: EventTypePO.USER_VOTED_COMMENT, data: event_data };

    const result = await queries.pgmqSendMessage(QUEUE_NAME, JSON.stringify(event), tx);

    if (result.success === false) {
      throw new ApplicationError("Failed to send message emit event!", "Internal server error.", { event });
    }
  };
}
