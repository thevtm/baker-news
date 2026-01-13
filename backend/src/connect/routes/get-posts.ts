import { desc } from "drizzle-orm";
import { create } from "@bufbuild/protobuf";

import { DBOrTx, schema } from "../../db/index.ts";
import * as proto from "../../proto/index.ts";

import { map_post, map_post_votes, map_user } from "../mappers.ts";

export function makeGetPostsRoute(db: DBOrTx) {
  return async (req: proto.GetPostsRequest): Promise<proto.GetPostsResponse> => {
    const { userId } = req;

    const db_posts = await db.query.posts.findMany({
      with: { author: true, votes: { where: (post_votes, { eq }) => eq(post_votes.userId, userId) } },
      orderBy: [desc(schema.posts.score)],
    });

    const proto_posts = db_posts.map((db_post) => {
      const proto_author = map_user(db_post.author);
      const proto_vote = map_post_votes(db_post.votes);

      const proto_post = map_post(db_post);
      proto_post.author = proto_author;
      proto_post.vote = proto_vote;

      return proto_post;
    });

    const postsList = create(proto.PostListSchema, { posts: proto_posts });
    const success = create(proto.GetPostsSuccessfulResponseSchema, { postList: postsList });
    const response = create(proto.GetPostsResponseSchema, { result: { case: "success", value: success } });

    return response;
  };
}
