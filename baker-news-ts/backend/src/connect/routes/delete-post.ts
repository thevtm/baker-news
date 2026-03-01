import invariant from "tiny-invariant";
import { create } from "@bufbuild/protobuf";

import { Commands } from "../../commands/index.ts";
import * as proto from "../../proto/index.ts";

export function makeDeletePostRoute(commands: Commands) {
  return async (req: proto.DeletePostRequest): Promise<proto.DeletePostResponse> => {
    const { postId } = req;

    const create_post_result = await commands.deletePost({ postId });

    if (create_post_result.success === false) {
      const error = create(proto.ErrorResponseSchema, { message: create_post_result.error });
      const response = create(proto.DeletePostResponseSchema, { result: { case: "error", value: error } });
      return response;
    }

    invariant(create_post_result.data?.post.id !== undefined);

    const success = create(proto.DeletePostSuccessfulResponseSchema, { postId: create_post_result.data.post.id });
    const response = create(proto.DeletePostResponseSchema, { result: { case: "success", value: success } });

    return response;
  };
}
