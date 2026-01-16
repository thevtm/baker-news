import invariant from "tiny-invariant";
import { create } from "@bufbuild/protobuf";
import { eachValueFrom } from "rxjs-for-await";

import { DBOrTx } from "../../db/index.ts";
import * as proto from "../../proto/index.ts";
import { Event, Events, EventType, UserVotedCommentEventData, UserVotedPostEventData } from "../../events.ts";
import { ApplicationError } from "../../error.ts";

import { map_comment, map_comment_vote, map_post, map_post_vote, map_post_votes, map_user } from "../mappers.ts";

export function makeGetPostFeedRoute(db: DBOrTx, events: Events) {
  return async function* (req: proto.GetPostFeedRequest): AsyncIterable<proto.GetPostFeedResponse> {
    const { userId, postId } = req;

    // Initial Post
    yield await initial_post(db, userId, postId);

    // Listen to events
    for await (const event of eachValueFrom(events.subject)) {
      if (event.type === EventType.USER_VOTED_POST && (event.data as UserVotedPostEventData).post.id === postId)
        yield user_voted_post(event, userId);
      else if (
        event.type === EventType.USER_VOTED_COMMENT &&
        (event.data as UserVotedCommentEventData).comment.postId === postId
      )
        yield user_voted_comment(event, userId);
      else invariant(false, `Unknown event type "${event.type}"`);
    }
  };
}

async function initial_post(db: DBOrTx, userId: number, postId: number): Promise<proto.GetPostFeedResponse> {
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
    throw new ApplicationError("Post not found", "Post not found", { postId });
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
  const success = create(proto.GetPostFeedSuccessfulResponseSchema, {
    event: { case: "initialPost", value: proto_post },
  });

  return create(proto.GetPostFeedResponseSchema, { result: { case: "success", value: success } });
}

function user_voted_post(event: Event, userId: number): proto.GetPostFeedResponse {
  const { post, postVote } = event.data as UserVotedPostEventData;
  let success: proto.GetPostFeedSuccessfulResponse | undefined = undefined;

  if (postVote.userId === userId) {
    const proto_user_voted_post = create(proto.UserVotedPostSchema, {
      vote: map_post_vote(postVote),
      newScore: post.score,
    });

    success = create(proto.GetPostFeedSuccessfulResponseSchema, {
      event: { case: "userVotedPost", value: proto_user_voted_post },
    });
  } else {
    const proto_post_score_changed_event = create(proto.PostScoreChangedSchema, {
      postId: post.id,
      newScore: post.score,
    });

    success = create(proto.GetPostFeedSuccessfulResponseSchema, {
      event: { case: "postScoreChanged", value: proto_post_score_changed_event },
    });
  }

  invariant(success !== undefined);

  const response = create(proto.GetPostFeedResponseSchema, { result: { case: "success", value: success } });
  return response;
}

function user_voted_comment(event: Event, userId: number): proto.GetPostFeedResponse {
  const { comment, commentVote } = event.data as UserVotedCommentEventData;
  let success: proto.GetPostFeedSuccessfulResponse | undefined = undefined;

  if (commentVote.userId === userId) {
    const proto_user_voted_post = create(proto.UserVotedCommentSchema, {
      vote: map_comment_vote(commentVote),
      newScore: comment.score,
    });

    success = create(proto.GetPostFeedSuccessfulResponseSchema, {
      event: { case: "userVotedComment", value: proto_user_voted_post },
    });
  } else {
    const proto_post_score_changed_event = create(proto.CommentScoreChangedSchema, {
      commentId: comment.id,
      newScore: comment.score,
    });

    success = create(proto.GetPostFeedSuccessfulResponseSchema, {
      event: { case: "commentScoreChanged", value: proto_post_score_changed_event },
    });
  }

  invariant(success !== undefined);

  const response = create(proto.GetPostFeedResponseSchema, { result: { case: "success", value: success } });
  return response;
}
