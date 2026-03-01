import invariant from "tiny-invariant";
import { create } from "@bufbuild/protobuf";

import { Commands } from "../../commands/index.ts";
import * as proto from "../../proto/index.ts";
import { DBOrTx } from "../../db/index.ts";

import { map_post, map_user } from "../mappers.ts";

export function makeCreatePostRoute(db: DBOrTx, commands: Commands) {
  return async (req: proto.CreatePostRequest): Promise<proto.CreatePostResponse> => {
    const { title, url, authorId } = req;

    const create_post_result = await commands.createPost({ title, url, authorId });

    if (create_post_result.success === false) {
      const error = create(proto.ErrorResponseSchema, { message: create_post_result.error });
      const response = create(proto.CreatePostResponseSchema, { result: { case: "error", value: error } });
      return response;
    }

    // Fetch post author data
    const post_author_result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, authorId),
    });
    invariant(post_author_result, "Post author has to exist");

    const post_author_proto = map_user(post_author_result);

    const post_proto = map_post(create_post_result.data!.post);
    post_proto.author = post_author_proto;

    const success = create(proto.CreatePostSuccessfulResponseSchema, { post: post_proto });
    const response = create(proto.CreatePostResponseSchema, { result: { case: "success", value: success } });

    return response;
  };
}
