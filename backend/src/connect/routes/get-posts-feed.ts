import { desc } from "drizzle-orm";
import invariant from "tiny-invariant";
import { create } from "@bufbuild/protobuf";
import { eachValueFrom } from "rxjs-for-await";

import * as proto from "../../proto/index.ts";
import { DBOrTx, schema } from "../../db/index.ts";
import { Events, EventType, Event, UserVotedPostEventData } from "../../events.ts";

import { map_post, map_post_vote, map_post_votes, map_user } from "../mappers.ts";

export function makeGetPostsFeedRoute(db: DBOrTx, events: Events) {
  return async function* (req: proto.GetPostsFeedRequest): AsyncIterable<proto.GetPostsFeedResponse> {
    const { userId } = req;

    // Initial Posts
    yield await initial_posts(db, userId);

    // Listen to events
    for await (const event of eachValueFrom(events.subject)) {
      if (event.type === EventType.USER_VOTED_POST) yield user_voted_post(event, userId);
      else invariant(false, `Unknown event type "${event.type}"`);
    }
  };
}

function user_voted_post(event: Event, userId: number): proto.GetPostsFeedResponse {
  const { post, postVote } = event.data as UserVotedPostEventData;
  let success: proto.GetPostsFeedSuccessfulResponse | undefined = undefined;

  if (postVote.userId === userId) {
    const proto_user_voted_post = create(proto.UserVotedPostSchema, {
      vote: map_post_vote(postVote),
      newScore: post.score,
    });

    success = create(proto.GetPostsFeedSuccessfulResponseSchema, {
      event: { case: "userVotedPost", value: proto_user_voted_post },
    });
  } else {
    const proto_post_score_changed_event = create(proto.PostScoreChangedSchema, {
      postId: post.id,
      newScore: post.score,
    });

    success = create(proto.GetPostsFeedSuccessfulResponseSchema, {
      event: { case: "postScoreChanged", value: proto_post_score_changed_event },
    });
  }

  invariant(success !== undefined);

  const response = create(proto.GetPostsFeedResponseSchema, { result: { case: "success", value: success } });
  return response;
}

async function initial_posts(db: DBOrTx, userId: number) {
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

  const success = create(proto.GetPostsFeedSuccessfulResponseSchema, {
    event: { case: "initialPosts", value: postsList },
  });

  const response = create(proto.GetPostsFeedResponseSchema, { result: { case: "success", value: success } });

  return response;
}
