import { assert } from "@std/assert";
import { desc } from "drizzle-orm";
import { create } from "@bufbuild/protobuf";
import { Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import type { ConnectRouter } from "@connectrpc/connect";

import { DBOrTx, schema } from "./db/index.ts";
import { createQueries } from "./queries/index.ts";
import { createCommands } from "./commands/index.ts";

import {
  BakerNewsService,
  CommentListSchema,
  CommentSchema,
  ErrorResponseSchema,
  GetPostListRequest,
  GetPostListResponse,
  GetPostListResponseSchema,
  GetPostListSuccessfulResponseSchema,
  GetPostRequest,
  GetPostResponse,
  GetPostResponseSchema,
  PostListSchema,
  PostSchema,
  UserRole,
  UserSchema,
  GetPostSuccessfulResponseSchema,
  VotePostRequest,
  VotePostResponse,
  VotePostResponseSchema,
  VoteType,
  VotePostSuccessfulResponseSchema,
  VoteCommentRequest,
  VoteCommentResponse,
  VoteCommentResponseSchema,
  VoteCommentSuccessfulResponseSchema,
} from "./proto/index.ts";

const USER_ROLE_MAP = new Map<schema.UserRoles | undefined, UserRole>([
  [undefined, UserRole.UNSPECIFIED],
  [schema.UserRoles.GUEST, UserRole.GUEST],
  [schema.UserRoles.USER, UserRole.USER],
  [schema.UserRoles.ADMIN, UserRole.ADMIN],
]);

const VOTE_TYPE_MAP = new Map<VoteType, schema.VoteType>([
  [VoteType.NO_VOTE, schema.VoteType.NO_VOTE],
  [VoteType.UP_VOTE, schema.VoteType.UP_VOTE],
  [VoteType.DOWN_VOTE, schema.VoteType.DOWN_VOTE],
]);

function convert_date_to_proto_timestamp(date: Date): Timestamp {
  const seconds = Math.floor(date.getTime() / 1000);
  return create(TimestampSchema, { seconds: BigInt(seconds) });
}

export const createRoutes = (db: DBOrTx) => {
  const queries = createQueries(db);
  const commands = createCommands(db, queries);

  return (router: ConnectRouter) =>
    router.service(BakerNewsService, {
      async getPostList(_req: GetPostListRequest): Promise<GetPostListResponse> {
        const db_posts = await db.query.posts.findMany({
          with: { author: true },
          orderBy: [desc(schema.posts.score)],
        });

        const proto_posts = db_posts.map((db_post) => {
          const proto_author = create(UserSchema, {
            id: db_post.author.id,
            username: db_post.author.username,
            role: USER_ROLE_MAP.get(db_post.author.role),
            createdAt: convert_date_to_proto_timestamp(db_post.createdAt),
            updatedAt: convert_date_to_proto_timestamp(db_post.updatedAt),
          });

          const proto_post = create(PostSchema, {
            id: db_post.id,
            title: db_post.title,
            url: db_post.url,
            score: db_post.score,
            author: proto_author,
            commentCount: db_post.commentsCount,
            commentsList: undefined,
            createdAt: convert_date_to_proto_timestamp(db_post.createdAt),
            updatedAt: convert_date_to_proto_timestamp(db_post.updatedAt),
          });

          return proto_post;
        });

        const postsList = create(PostListSchema, { Posts: proto_posts });
        const success = create(GetPostListSuccessfulResponseSchema, { postList: postsList });
        const response = create(GetPostListResponseSchema, { result: { case: "success", value: success } });

        return response;
      },
      async getPost(req: GetPostRequest): Promise<GetPostResponse> {
        const postId = req.id;

        const db_post = await db.query.posts.findFirst({
          where: (posts, { eq }) => eq(posts.id, postId),
          with: { author: true, comments: { with: { author: true }, orderBy: [desc(schema.comments.score)] } },
        });

        if (db_post === undefined) {
          const error = create(ErrorResponseSchema, { message: "Post not found" });
          const response = create(GetPostResponseSchema, { result: { case: "error", value: error } });
          return response;
        }

        const proto_author = create(UserSchema, {
          id: db_post.author.id,
          username: db_post.author.username,
          role: USER_ROLE_MAP.get(db_post.author.role),
        });

        const proto_comments = db_post.comments.map((db_comment) => {
          const proto_comment_author = create(UserSchema, {
            id: db_comment.author.id,
            username: db_comment.author.username,
            role: USER_ROLE_MAP.get(db_comment.author.role),
          });

          return create(CommentSchema, {
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

        const proto_comments_list = create(CommentListSchema, { comments: proto_comments });

        const proto_post = create(PostSchema, {
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

        return create(GetPostResponseSchema, {
          result: {
            case: "success",
            value: create(GetPostSuccessfulResponseSchema, { post: proto_post }),
          },
        });
      },
      async votePost(req: VotePostRequest): Promise<VotePostResponse> {
        const { postId, userId, voteType } = req;

        const converted_vote_type = VOTE_TYPE_MAP.get(voteType);
        assert(converted_vote_type !== undefined, "Invalid vote type");

        const vote_post_result = await commands.votePost({ postId, userId, voteType: converted_vote_type });

        if (vote_post_result.success === false) {
          const error = create(ErrorResponseSchema, { message: vote_post_result.error });
          const response = create(VotePostResponseSchema, { result: { case: "error", value: error } });
          return response;
        }

        const vote_post_data = vote_post_result.data!;

        const success = create(VotePostSuccessfulResponseSchema, { newScore: vote_post_data.newScore });

        return create(VotePostResponseSchema, { result: { case: "success", value: success } });
      },
      async voteComment(req: VoteCommentRequest): Promise<VoteCommentResponse> {
        const { commentId, userId, voteType } = req;

        const converted_vote_type = VOTE_TYPE_MAP.get(voteType);
        assert(converted_vote_type !== undefined, "Invalid vote type");

        const vote_comment_result = await commands.voteComment({ commentId, userId, voteType: converted_vote_type });

        if (vote_comment_result.success === false) {
          const error = create(ErrorResponseSchema, { message: vote_comment_result.error });
          const response = create(VoteCommentResponseSchema, { result: { case: "error", value: error } });
          return response;
        }

        const vote_comment_data = vote_comment_result.data!;

        const success = create(VoteCommentSuccessfulResponseSchema, { newScore: vote_comment_data.newScore });

        return create(VoteCommentResponseSchema, { result: { case: "success", value: success } });
      },
    });
};
