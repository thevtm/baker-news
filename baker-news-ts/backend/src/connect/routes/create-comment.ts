import invariant from "tiny-invariant";
import { create } from "@bufbuild/protobuf";

import { Commands } from "../../commands/index.ts";
import * as proto from "../../proto/index.ts";
import { DBOrTx } from "../../db/index.ts";

import { map_comment, map_user } from "../mappers.ts";

export function makeCreateCommentRoute(db: DBOrTx, commands: Commands) {
  return async (req: proto.CreateCommentRequest): Promise<proto.CreateCommentResponse> => {
    const { authorId, parent, content } = req;

    const postId = parent.case === "postId" ? parent.value : undefined;
    const parentCommentId = parent.case === "commentId" ? parent.value : undefined;
    invariant(postId || parentCommentId, "Either postId or commentId must be provided");

    const create_comment_result = await commands.createComment({ authorId, postId, parentCommentId, content });

    if (create_comment_result.success === false) {
      const error = create(proto.ErrorResponseSchema, { message: create_comment_result.error });
      const response = create(proto.CreateCommentResponseSchema, { result: { case: "error", value: error } });
      return response;
    }

    // Fetch author data
    const author_result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, authorId),
    });
    invariant(author_result, "Comment author has to exist");

    const author_proto = map_user(author_result);

    const comment_proto = map_comment(create_comment_result.data!.comment);
    comment_proto.author = author_proto;

    const success = create(proto.CreateCommentSuccessfulResponseSchema, { comment: comment_proto });
    const response = create(proto.CreateCommentResponseSchema, { result: { case: "success", value: success } });

    return response;
  };
}
