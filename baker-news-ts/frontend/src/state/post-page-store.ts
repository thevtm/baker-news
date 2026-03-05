import { proxy, ref } from "valtio";
import { proxyMap } from "valtio/utils";
import invariant from "tiny-invariant";

import * as proto from "../proto/index.ts";
import { APIClient } from "../api-client.ts";
import { Code, ConnectError } from "@connectrpc/connect";

export enum PostPageState {
  Initial = "initial",
  Error = "error",
  Loading = "loading",
  Live = "live",
}

export interface PostPageComment {
  comment: proto.Comment;
  children: PostPageComment[];
}

export interface PostPageStore {
  state: PostPageState;
  post: proto.Post | null;
  comments: Map<number, PostPageComment>;
  rootComments: PostPageComment[];
  abort_controller: AbortController | null;
}

export function makePostStore(): PostPageStore {
  const store = proxy<PostPageStore>({
    state: PostPageState.Initial,
    post: null,
    comments: proxyMap(),
    rootComments: [],
    abort_controller: null,
  });

  return store;
}

export function startLoadingPost(store: PostPageStore, api_client: APIClient, user_id: number, post_id: number): void {
  if (store.state !== PostPageState.Initial && store.state !== PostPageState.Error) return;

  const abort_controller = new AbortController();
  store.abort_controller = ref(abort_controller);
  store.state = PostPageState.Loading;

  (async () => {
    try {
      const feed = api_client.getPostFeed({ userId: user_id, postId: post_id }, { signal: abort_controller.signal });
      for await (const response of feed) handle_feed_event(store, response);
    } catch (err) {
      if (err instanceof ConnectError && err.code === Code.Canceled) {
        // Aborted, expected
      } else {
        throw err;
      }
    }
  })();
}

export function stopLoadingPost(store: PostPageStore): void {
  if (store.state !== PostPageState.Loading && store.state !== PostPageState.Live) return;

  invariant(store.abort_controller !== null);
  store.abort_controller.abort("Stopped loading post");
  store.abort_controller = null;

  store.state = PostPageState.Initial;
}

function handle_feed_event(store: PostPageStore, response: proto.GetPostFeedResponse): void {
  invariant(response.result.case === "success");

  const event: proto.GetPostFeedSuccessfulResponse["event"] = response.result.value.event;

  if (event.case === "initialPost") {
    handle_initial_post(event, store);
  } else if (event.case === "postScoreChanged") {
    const post_scored_changed_event: proto.PostScoreChanged = event.value;
    invariant(store.post !== null);
    store.post.score = post_scored_changed_event.newScore;
  } else if (event.case === "userVotedPost") {
    const user_voted_post_event: proto.UserVotedPost = event.value;
    invariant(store.post !== null);
    store.post.vote = user_voted_post_event.vote;
    store.post.score = user_voted_post_event.newScore;
  } else if (event.case === "userVotedComment") {
    const { vote, newScore }: proto.UserVotedComment = event.value;
    invariant(store.post !== null);

    const comment = store.comments.get(vote!.commentId);
    invariant(comment !== undefined);

    comment.comment.vote = vote;
    comment.comment.score = newScore;
  } else if (event.case === "commentScoreChanged") {
    const { commentId, newScore }: proto.CommentScoreChanged = event.value;
    invariant(store.post !== null);

    const comment = store.post.comments!.comments.find((c) => c.id === commentId);
    invariant(comment !== undefined);

    comment.score = newScore;
  } else if (event.case === "commentCreated") {
    handle_comment_created(event, store);
  }
}

function handle_initial_post(event: { value: proto.Post; case: "initialPost" }, store: PostPageStore) {
  // Post
  const post: proto.Post = event.value;
  store.post = post;

  // Index comments
  for (const comment of post.comments!.comments) {
    const postPageComment: PostPageComment = {
      comment,
      children: [],
    };
    store.comments.set(comment.id, postPageComment);
  }

  // Set up Comments relationships
  for (const comment of store.comments.values()) {
    const { parentCommentId } = comment.comment;

    if (parentCommentId === undefined) {
      store.rootComments.push(comment);
    } else {
      const parentComment = store.comments.get(parentCommentId);
      invariant(parentComment !== undefined);
      parentComment.children.push(comment);
    }
  }

  store.state = PostPageState.Live;
}

function handle_comment_created(event: { value: proto.CommentCreated; case: "commentCreated" }, store: PostPageStore) {
  const { comment } = event.value;
  invariant(comment !== undefined);
  invariant(store.post !== null);

  const postPageComment: PostPageComment = {
    comment,
    children: [],
  };
  store.comments.set(comment.id, postPageComment);

  // Set up Comments relationships
  if (comment.parentCommentId === undefined) {
    store.rootComments.push(postPageComment);
  } else {
    const parentComment = store.comments.get(comment.parentCommentId);
    invariant(parentComment !== undefined);
    parentComment.children.push(postPageComment);
  }
}
