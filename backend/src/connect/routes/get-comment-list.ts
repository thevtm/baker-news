import { desc } from "drizzle-orm";
import invariant from "tiny-invariant";
import { create } from "@bufbuild/protobuf";

import { DBOrTx, schema } from "../../db/index.ts";
import * as proto from "../../proto/index.ts";

import { SCHEMA_TO_PROTO_VOTE_TYPE_MAP, USER_ROLE_MAP } from "../mappers.ts";

export function makeGetCommentListRoute(db: DBOrTx) {
  return async (req: proto.GetCommentListRequest): Promise<proto.GetCommentListResponse> => {
    const { userId, postId } = req;

    const db_comments = await db.query.comments.findMany({
      where: (comments, { eq }) => eq(comments.postId, postId),
      with: { author: true, votes: { where: (votes, { eq }) => eq(votes.userId, userId) } },
      orderBy: [desc(schema.comments.score)],
    });

    const proto_comments = db_comments.map((db_comment) => {
      // Author
      const proto_comment_author = create(proto.UserSchema, {
        id: db_comment.author.id,
        username: db_comment.author.username,
        role: USER_ROLE_MAP.get(db_comment.author.role),
      });

      // Vote
      let proto_vote: proto.CommentVote | undefined = undefined;

      invariant(db_comment.votes.length <= 1);

      if (db_comment.votes.length === 1) {
        const db_vote = db_comment.votes[0];

        proto_vote = create(proto.CommentVoteSchema, {
          id: db_vote.userId,
          commentId: db_vote.commentId,
          userId: db_vote.userId,
          voteType: SCHEMA_TO_PROTO_VOTE_TYPE_MAP.get(db_vote.voteType),
          createdAt: proto.convert_date_to_proto_timestamp(db_vote.createdAt),
          updatedAt: proto.convert_date_to_proto_timestamp(db_vote.updatedAt),
        });
      }

      // Comment
      return create(proto.CommentSchema, {
        id: db_comment.id,
        author: proto_comment_author,
        postId: db_comment.postId,
        parentCommentId: db_comment.parentCommentId ?? undefined,
        content: db_comment.content,
        score: db_comment.score,
        commentCount: db_comment.commentsCount,
        vote: proto_vote,
        createdAt: proto.convert_date_to_proto_timestamp(db_comment.createdAt),
        updatedAt: proto.convert_date_to_proto_timestamp(db_comment.updatedAt),
      });
    });

    const commentsList = create(proto.CommentListSchema, { comments: proto_comments });
    const success = create(proto.GetCommentListSuccessfulResponseSchema, { commentList: commentsList });
    const response = create(proto.GetCommentListResponseSchema, { result: { case: "success", value: success } });

    return response;
  };
}
