import { DBOrTx } from "../db/index.ts";
import { ApplicationError } from "../error.ts";
import { Queries } from "../queries/index.ts";

import { EventPO, EventTypePO, QUEUE_NAME, UserDeletedPostEventPOData } from "./persisted.ts";

export type EmitUserDeletedPostFunction = (
  postId: number,

  tx?: DBOrTx
) => Promise<void>;

export function makeEmitUserDeletedPostEvent(queries: Queries): EmitUserDeletedPostFunction {
  return async (postId, tx) => {
    const event_data: UserDeletedPostEventPOData = { postId };

    const event: EventPO = {
      type: EventTypePO.USER_DELETED_POST,
      data: event_data,
    };

    const result = await queries.pgmqSendMessage(QUEUE_NAME, JSON.stringify(event), tx);

    if (result.success === false) {
      throw new ApplicationError("Failed to send message emit event!", "Internal server error.", { event });
    }
  };
}
