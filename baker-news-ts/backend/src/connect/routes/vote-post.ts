import { create } from "@bufbuild/protobuf";
import invariant from "tiny-invariant";

import * as proto from "../../proto/index.ts";
import { Commands } from "../../commands/index.ts";

import { PROTO_TO_SCHEMA_VOTE_TYPE_MAP, SCHEMA_TO_PROTO_VOTE_TYPE_MAP } from "../mappers.ts";

export function makeVotePostRoute(commands: Commands) {
  return async (req: proto.VotePostRequest): Promise<proto.VotePostResponse> => {
    try {
      const { postId, userId, voteType } = req;

      const converted_vote_type = PROTO_TO_SCHEMA_VOTE_TYPE_MAP.get(voteType);
      invariant(converted_vote_type !== undefined, "Invalid vote type");

      const vote_post_result = await commands.votePost({ postId, userId, voteType: converted_vote_type });

      if (vote_post_result.success === false) {
        const error = create(proto.ErrorResponseSchema, { message: vote_post_result.error });
        const response = create(proto.VotePostResponseSchema, { result: { case: "error", value: error } });
        return response;
      }

      const vote_post_data = vote_post_result.data!;

      const success = create(proto.VotePostSuccessfulResponseSchema, {
        newScore: vote_post_data.newScore,
        vote: create(proto.PostVoteSchema, {
          id: vote_post_data.vote.userId,
          postId: vote_post_data.vote.postId,
          userId: vote_post_data.vote.userId,
          voteType: SCHEMA_TO_PROTO_VOTE_TYPE_MAP.get(vote_post_data.vote.voteType),
          createdAt: proto.convert_date_to_proto_timestamp(vote_post_data.vote.createdAt),
          updatedAt: proto.convert_date_to_proto_timestamp(vote_post_data.vote.updatedAt),
        }),
      });

      return create(proto.VotePostResponseSchema, { result: { case: "success", value: success } });
    } catch (err) {
      console.error("Error in votePost route:", err);
      throw err;
    }
  };
}
