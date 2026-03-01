import { DBOrTx } from "../db/index.ts";
import { ApplicationError } from "../error.ts";
import { Queries } from "../queries/index.ts";

import { EventPO, EventTypePO, QUEUE_NAME, UserCreatedPostEventPOData } from "./persisted.ts";

export type EmitUserCreatedPostFunction = (
  postId: number,
  authorId: number,

  tx?: DBOrTx
) => Promise<void>;

export function makeEmitUserCreatedPostEvent(queries: Queries): EmitUserCreatedPostFunction {
  return async (postId, authorId, tx) => {
    const event_data: UserCreatedPostEventPOData = { postId, authorId };

    const event: EventPO = {
      type: EventTypePO.USER_CREATED_POST,
      data: event_data,
    };

    const result = await queries.pgmqSendMessage(QUEUE_NAME, JSON.stringify(event), tx);

    if (result.success === false) {
      throw new ApplicationError("Failed to send message emit event!", "Internal server error.", { event });
    }
  };
}
