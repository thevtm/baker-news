import { DBOrTx } from "../db/index.ts";
import { ApplicationError } from "../error.ts";
import { Queries } from "../queries/index.ts";

import { EventPO, EventTypePO, QUEUE_NAME, UserCreatedCommentEventPOData } from "./persisted.ts";

export type EmitUserCreatedCommentFunction = (
  commentId: number,
  authorId: number,

  tx?: DBOrTx
) => Promise<void>;

export function makeEmitUserCreatedCommentEvent(queries: Queries): EmitUserCreatedCommentFunction {
  return async (commentId, authorId, tx) => {
    const event_data: UserCreatedCommentEventPOData = { commentId, authorId };

    const event: EventPO = {
      type: EventTypePO.USER_CREATED_COMMENT,
      data: event_data,
    };

    const result = await queries.pgmqSendMessage(QUEUE_NAME, JSON.stringify(event), tx);

    if (result.success === false) {
      throw new ApplicationError("Failed to send message emit event!", "Internal server error.", { event });
    }
  };
}
