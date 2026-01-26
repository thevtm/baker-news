import { DBOrTx } from "../db/index.ts";
import { ApplicationError } from "../error.ts";
import { Queries } from "../queries/index.ts";

import { EventPO, EventTypePO, UserVotedPostEventPOData, QUEUE_NAME } from "./persisted.ts";

export type EmitUserVotedPostFunction = (
  postVoteId: number,

  postId: number,
  userId: number,

  tx?: DBOrTx
) => Promise<void>;

export function makeEmitUserVotedPostEvent(queries: Queries): EmitUserVotedPostFunction {
  return async (postVoteId, postId, userId, tx) => {
    const event_data: UserVotedPostEventPOData = { postVoteId, postId, userId };
    const event: EventPO = { type: EventTypePO.USER_VOTED_POST, data: event_data };

    const result = await queries.pgmqSendMessage(QUEUE_NAME, JSON.stringify(event), tx);

    if (result.success === false) {
      throw new ApplicationError("Failed to send message emit event!", "Internal server error.", { event });
    }
  };
}
