import { create } from "@bufbuild/protobuf";
import invariant from "tiny-invariant";

import * as proto from "../../proto/index.ts";
import { Commands } from "../../commands/index.ts";

import { PROTO_TO_SCHEMA_VOTE_TYPE_MAP } from "../mappers.ts";

export function makeVoteCommentRoute(commands: Commands) {
  return async (req: proto.VoteCommentRequest): Promise<proto.VoteCommentResponse> => {
    const { commentId, userId, voteType } = req;

    const converted_vote_type = PROTO_TO_SCHEMA_VOTE_TYPE_MAP.get(voteType);
    invariant(converted_vote_type !== undefined, "Invalid vote type");

    const vote_comment_result = await commands.voteComment({ commentId, userId, voteType: converted_vote_type });

    if (vote_comment_result.success === false) {
      const error = create(proto.ErrorResponseSchema, { message: vote_comment_result.error });
      const response = create(proto.VoteCommentResponseSchema, { result: { case: "error", value: error } });
      return response;
    }

    const vote_comment_data = vote_comment_result.data!;

    const success = create(proto.VoteCommentSuccessfulResponseSchema, { newScore: vote_comment_data.newScore });

    return create(proto.VoteCommentResponseSchema, { result: { case: "success", value: success } });
  };
}
