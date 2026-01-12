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
        const user_proto = map_user(user_data.user);
        const success = create(proto.CreateUserSuccessfulResponseSchema, { user: user_proto });
        const response = create(proto.CreateUserResponseSchema, { result: { case: "success", value: success } });

        return response;
      },
      async getPosts(req: proto.GetPostsRequest): Promise<proto.GetPostsResponse> {
        const { userId } = req;

        const db_posts = await db.query.posts.findMany({
          with: { author: true, votes: { where: (post_votes, { eq }) => eq(post_votes.userId, userId) } },
          orderBy: [desc(schema.posts.score)],
        });

        const proto_posts = db_posts.map((db_post) => {
          const proto_author = map_user(db_post.author);
          const proto_vote = map_post_vote(db_post.votes);

          const proto_post = map_post(db_post);
          proto_post.author = proto_author;
          proto_post.vote = proto_vote;

          return proto_post;
        });

        const postsList = create(proto.PostListSchema, { posts: proto_posts });
        const success = create(proto.GetPostListSuccessfulResponseSchema, { postList: postsList });
        const response = create(proto.GetPostsResponseSchema, { result: { case: "success", value: success } });

        return response;
      },
      async getPost(req: proto.GetPostRequest): Promise<proto.GetPostResponse> {
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
        const proto_vote = map_post_vote(db_post.votes);

        // Comments
        const proto_comments = db_post.comments.map((db_comment) => {
          const proto_comment_author = map_user(db_comment.author);
          const proto_vote = map_comment_vote(db_comment.votes);

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
      },
      async getCommentList(req: proto.GetCommentListRequest): Promise<proto.GetCommentListResponse> {
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

          assert(db_comment.votes.length <= 1);

          if (db_comment.votes.length === 1) {
            const db_vote = db_comment.votes[0];

            proto_vote = create(proto.CommentVoteSchema, {
              id: db_vote.userId,
              commentId: db_vote.commentId,
              userId: db_vote.userId,
              voteType: SCHEMA_TO_PROTO_VOTE_TYPE_MAP.get(db_vote.voteType),
              createdAt: convert_date_to_proto_timestamp(db_vote.createdAt),
              updatedAt: convert_date_to_proto_timestamp(db_vote.updatedAt),
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
            createdAt: convert_date_to_proto_timestamp(db_comment.createdAt),
            updatedAt: convert_date_to_proto_timestamp(db_comment.updatedAt),
          });
        });

        const commentsList = create(proto.CommentListSchema, { comments: proto_comments });
        const success = create(proto.GetCommentListSuccessfulResponseSchema, { commentList: commentsList });
        const response = create(proto.GetCommentListResponseSchema, { result: { case: "success", value: success } });

        return response;
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

function map_post(db_post: typeof schema.posts.$inferSelect): proto.Post {
  return create(proto.PostSchema, {
    id: db_post.id,
    title: db_post.title,
    url: db_post.url,
    score: db_post.score,
    commentCount: db_post.commentsCount,
    comments: undefined,
    createdAt: convert_date_to_proto_timestamp(db_post.createdAt),
    updatedAt: convert_date_to_proto_timestamp(db_post.updatedAt),
  });
}

function map_post_vote(post_vote: (typeof schema.postVotes.$inferSelect)[]): proto.PostVote | undefined {
  assert(post_vote.length <= 1);

  let proto_vote: proto.PostVote | undefined = undefined;

  if (post_vote.length === 1) {
    const db_vote = post_vote[0];

    proto_vote = create(proto.PostVoteSchema, {
      id: db_vote.userId,
      postId: db_vote.postId,
      userId: db_vote.userId,
      voteType: SCHEMA_TO_PROTO_VOTE_TYPE_MAP.get(db_vote.voteType),
      createdAt: convert_date_to_proto_timestamp(db_vote.createdAt),
      updatedAt: convert_date_to_proto_timestamp(db_vote.updatedAt),
    });
  }

  return proto_vote;
}

function map_comment(db_comment: typeof schema.comments.$inferSelect): proto.Comment {
  return create(proto.CommentSchema, {
    id: db_comment.id,
    postId: db_comment.postId,
    parentCommentId: db_comment.parentCommentId ?? undefined,
    content: db_comment.content,
    score: db_comment.score,
    commentCount: db_comment.commentsCount,
    createdAt: convert_date_to_proto_timestamp(db_comment.createdAt),
    updatedAt: convert_date_to_proto_timestamp(db_comment.updatedAt),
  });
}

function map_comment_vote(comment_vote: (typeof schema.commentVotes.$inferSelect)[]): proto.CommentVote | undefined {
  assert(comment_vote.length <= 1);

  let proto_vote: proto.CommentVote | undefined = undefined;

  if (comment_vote.length === 1) {
    const db_vote = comment_vote[0];

    proto_vote = create(proto.CommentVoteSchema, {
      id: db_vote.userId,
      commentId: db_vote.commentId,
      userId: db_vote.userId,
      voteType: SCHEMA_TO_PROTO_VOTE_TYPE_MAP.get(db_vote.voteType),
      createdAt: convert_date_to_proto_timestamp(db_vote.createdAt),
      updatedAt: convert_date_to_proto_timestamp(db_vote.updatedAt),
    });
  }

  return proto_vote;
}

function map_user(db_user: typeof schema.users.$inferSelect): proto.User {
  return create(proto.UserSchema, {
    id: db_user.id,
    username: db_user.username,
    role: USER_ROLE_MAP.get(db_user.role),
    createdAt: convert_date_to_proto_timestamp(db_user.createdAt),
    updatedAt: convert_date_to_proto_timestamp(db_user.updatedAt),
  });
}
