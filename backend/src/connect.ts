import { assert } from "@std/assert";
import { desc } from "drizzle-orm";
import { create } from "@bufbuild/protobuf";
import { Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import type { ConnectRouter } from "@connectrpc/connect";

import { DBOrTx, schema } from "./db/index.ts";
import { createQueries } from "./queries/index.ts";
import { createCommands } from "./commands/index.ts";
import * as proto from "./proto/index.ts";

const USER_ROLE_MAP = new Map<schema.UserRoles | undefined, proto.UserRole>([
  [undefined, proto.UserRole.UNSPECIFIED],
  [schema.UserRoles.GUEST, proto.UserRole.GUEST],
  [schema.UserRoles.USER, proto.UserRole.USER],
  [schema.UserRoles.ADMIN, proto.UserRole.ADMIN],
]);

const PROTO_TO_SCHEMA_VOTE_TYPE_MAP = new Map<proto.VoteType, schema.VoteType>([
  [proto.VoteType.NO_VOTE, schema.VoteType.NO_VOTE],
  [proto.VoteType.UP_VOTE, schema.VoteType.UP_VOTE],
  [proto.VoteType.DOWN_VOTE, schema.VoteType.DOWN_VOTE],
]);

const SCHEMA_TO_PROTO_VOTE_TYPE_MAP = new Map<schema.VoteType, proto.VoteType>([
  [schema.VoteType.NO_VOTE, proto.VoteType.NO_VOTE],
  [schema.VoteType.UP_VOTE, proto.VoteType.UP_VOTE],
  [schema.VoteType.DOWN_VOTE, proto.VoteType.DOWN_VOTE],
]);

function convert_date_to_proto_timestamp(date: Date): Timestamp {
  const seconds = Math.floor(date.getTime() / 1000);
  return create(TimestampSchema, { seconds: BigInt(seconds) });
}

export const createRoutes = (db: DBOrTx) => {
  const queries = createQueries(db);
  const commands = createCommands(db, queries);

  return (router: ConnectRouter) =>
    router.service(proto.BakerNewsService, {
      async createUser(req: proto.CreateUserRequest): Promise<proto.CreateUserResponse> {
        const { username } = req;

        const create_user_result = await commands.createUser({ username });

        if (create_user_result.success === false) {
          const error = create(proto.ErrorResponseSchema, { message: create_user_result.error });
          const response = create(proto.CreateUserResponseSchema, { result: { case: "error", value: error } });
          return response;
        }

        const user_data = create_user_result.data!;
        const user_proto = create(proto.UserSchema, {
          id: user_data.user.id,
          username: user_data.user.username,
          role: USER_ROLE_MAP.get(user_data.user.role),
          createdAt: convert_date_to_proto_timestamp(user_data.user.createdAt),
          updatedAt: convert_date_to_proto_timestamp(user_data.user.updatedAt),
        });

        return create(proto.CreateUserResponseSchema, {
          result: {
            case: "success",
            value: create(proto.CreateUserSuccessfulResponseSchema, { user: user_proto }),
          },
        });
      },
      async getPostList(req: proto.GetPostListRequest): Promise<proto.GetPostListResponse> {
        const { userId } = req;

        const db_posts = await db.query.posts.findMany({
          with: { author: true, votes: { where: (post_votes, { eq }) => eq(post_votes.userId, userId) } },
          orderBy: [desc(schema.posts.score)],
        });

        const proto_posts = db_posts.map((db_post) => {
          const proto_author = create(proto.UserSchema, {
            id: db_post.author.id,
            username: db_post.author.username,
            role: USER_ROLE_MAP.get(db_post.author.role),
            createdAt: convert_date_to_proto_timestamp(db_post.createdAt),
            updatedAt: convert_date_to_proto_timestamp(db_post.updatedAt),
          });

          assert(db_post.votes.length <= 1, "Post should have at most one vote from the user");

          let proto_vote: proto.PostVote | undefined = undefined;

          if (db_post.votes.length === 1) {
            const db_vote = db_post.votes[0];

            proto_vote = create(proto.PostVoteSchema, {
              id: db_vote.userId,
              postId: db_vote.postId,
              userId: db_vote.userId,
              voteType: SCHEMA_TO_PROTO_VOTE_TYPE_MAP.get(db_vote.voteType),
              createdAt: convert_date_to_proto_timestamp(db_vote.createdAt),
              updatedAt: convert_date_to_proto_timestamp(db_vote.updatedAt),
            });
          }

          const proto_post = create(proto.PostSchema, {
            id: db_post.id,
            title: db_post.title,
            url: db_post.url,
            score: db_post.score,
            author: proto_author,
            commentCount: db_post.commentsCount,
            commentsList: undefined,
            vote: proto_vote,
            createdAt: convert_date_to_proto_timestamp(db_post.createdAt),
            updatedAt: convert_date_to_proto_timestamp(db_post.updatedAt),
          });

          return proto_post;
        });

        const postsList = create(proto.PostListSchema, { Posts: proto_posts });
        const success = create(proto.GetPostListSuccessfulResponseSchema, { postList: postsList });
        const response = create(proto.GetPostListResponseSchema, { result: { case: "success", value: success } });

        return response;
      },
      async getPost(req: proto.GetPostRequest): Promise<proto.GetPostResponse> {
        const postId = req.id;

        const db_post = await db.query.posts.findFirst({
          where: (posts, { eq }) => eq(posts.id, postId),
          with: { author: true, comments: { with: { author: true }, orderBy: [desc(schema.comments.score)] } },
        });

        if (db_post === undefined) {
          const error = create(proto.ErrorResponseSchema, { message: "Post not found" });
          const response = create(proto.GetPostResponseSchema, { result: { case: "error", value: error } });
          return response;
        }

        const proto_author = create(proto.UserSchema, {
          id: db_post.author.id,
          username: db_post.author.username,
          role: USER_ROLE_MAP.get(db_post.author.role),
        });

        const proto_comments = db_post.comments.map((db_comment) => {
          const proto_comment_author = create(proto.UserSchema, {
            id: db_comment.author.id,
            username: db_comment.author.username,
            role: USER_ROLE_MAP.get(db_comment.author.role),
          });

          return create(proto.CommentSchema, {
            id: db_comment.id,
            author: proto_comment_author,
            content: db_comment.content,
            score: db_comment.score,
            commentCount: db_comment.commentsCount,
            post: undefined,
            createdAt: convert_date_to_proto_timestamp(db_comment.createdAt),
            updatedAt: convert_date_to_proto_timestamp(db_comment.updatedAt),
          });
        });

        const proto_comments_list = create(proto.CommentListSchema, { comments: proto_comments });

        const proto_post = create(proto.PostSchema, {
          id: db_post.id,
          title: db_post.title,
          url: db_post.url,
          score: db_post.score,
          author: proto_author,
          commentCount: db_post.commentsCount,
          commentsList: proto_comments_list,
          createdAt: convert_date_to_proto_timestamp(db_post.createdAt),
          updatedAt: convert_date_to_proto_timestamp(db_post.updatedAt),
        });

        return create(proto.GetPostResponseSchema, {
          result: {
            case: "success",
            value: create(proto.GetPostSuccessfulResponseSchema, { post: proto_post }),
          },
        });
      },
      async votePost(req: proto.VotePostRequest): Promise<proto.VotePostResponse> {
        const { postId, userId, voteType } = req;

        const converted_vote_type = PROTO_TO_SCHEMA_VOTE_TYPE_MAP.get(voteType);
        assert(converted_vote_type !== undefined, "Invalid vote type");

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
            createdAt: convert_date_to_proto_timestamp(vote_post_data.vote.createdAt),
            updatedAt: convert_date_to_proto_timestamp(vote_post_data.vote.updatedAt),
          }),
        });

        return create(proto.VotePostResponseSchema, { result: { case: "success", value: success } });
      },
      async voteComment(req: proto.VoteCommentRequest): Promise<proto.VoteCommentResponse> {
        const { commentId, userId, voteType } = req;

        const converted_vote_type = PROTO_TO_SCHEMA_VOTE_TYPE_MAP.get(voteType);
        assert(converted_vote_type !== undefined, "Invalid vote type");

        const vote_comment_result = await commands.voteComment({ commentId, userId, voteType: converted_vote_type });

        if (vote_comment_result.success === false) {
          const error = create(proto.ErrorResponseSchema, { message: vote_comment_result.error });
          const response = create(proto.VoteCommentResponseSchema, { result: { case: "error", value: error } });
          return response;
        }

        const vote_comment_data = vote_comment_result.data!;

        const success = create(proto.VoteCommentSuccessfulResponseSchema, { newScore: vote_comment_data.newScore });

        return create(proto.VoteCommentResponseSchema, { result: { case: "success", value: success } });
      },
    });
};
