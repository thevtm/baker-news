import { create } from "@bufbuild/protobuf";

import { DBOrTx } from "../../db/index.ts";
import * as proto from "../../proto/index.ts";

import { map_comment, map_comment_vote, map_post, map_post_votes, map_user } from "../mappers.ts";

export function makeGetPostRoute(db: DBOrTx) {
  return async (req: proto.GetPostRequest): Promise<proto.GetPostResponse> => {
    const { userId, postId } = req;

    const db_post = await db.query.posts.findFirst({
      where: (posts, { eq }) => eq(posts.id, postId),
      with: {
        author: true,
        votes: { where: (post_votes, { eq }) => eq(post_votes.userId, userId) },
        comments: {
          with: { author: true, votes: { where: (comment_votes, { eq }) => eq(comment_votes.userId, userId) } },
        },
      },
    });

    if (db_post === undefined) {
      const error = create(proto.ErrorResponseSchema, { message: "Post not found" });
      const response = create(proto.GetPostResponseSchema, { result: { case: "error", value: error } });
      return response;
    }

    // Proto
    const proto_author = map_user(db_post.author);
    const proto_vote = map_post_votes(db_post.votes);

    // Comments
    const proto_comments = db_post.comments.map((db_comment) => {
      const proto_comment_author = map_user(db_comment.author);
      const proto_vote = db_comment.votes.length === 1 ? map_comment_vote(db_comment.votes[0]) : undefined;

      const comment = map_comment(db_comment);
      comment.author = proto_comment_author;
      comment.vote = proto_vote;

      return comment;
    });

    const proto_comments_list = create(proto.CommentListSchema, { comments: proto_comments });

    const proto_post = map_post(db_post);
    proto_post.author = proto_author;
    proto_post.vote = proto_vote;
    proto_post.comments = proto_comments_list;

    // Response
    const success = create(proto.GetPostSuccessfulResponseSchema, { post: proto_post });
    const response = create(proto.GetPostResponseSchema, { result: { case: "success", value: success } });

    return response;
  };
}
