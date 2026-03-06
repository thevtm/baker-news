import invariant from "tiny-invariant";
import { proxy, ref } from "valtio";
import { proxyMap } from "valtio/utils";
import { Code, ConnectError } from "@connectrpc/connect";

import * as proto from "../proto/index.ts";
import { APIClient } from "../api-client.ts";

export enum PostPageState {
  Initial = "initial",
  Error = "error",
  Loading = "loading",
  Live = "live",
  Stopped = "stopped",
}

export interface PostPageComment {
  comment: proto.Comment;
  children: PostPageComment[];
}

export interface PostPageStore {
  post: proto.Post | null;
  comments: Map<number, PostPageComment>;
  rootComments: PostPageComment[];
  promise: Promise<void>;

  _state: PostPageState;
  _promise_resolve: () => void;
  _promise_reject: (reason?: unknown) => void;
  _abort_controller: AbortController | null;

  isIdle: boolean;
}

export function makePostStore(): PostPageStore {
  const [promise, promise_resolve, promise_reject] = make_promise();

  const store = proxy<PostPageStore>({
    post: null,
    comments: proxyMap(),
    rootComments: [],
    promise: ref(promise),

    _state: PostPageState.Initial,
    _promise_resolve: promise_resolve,
    _promise_reject: promise_reject,
    _abort_controller: null,

    get isIdle() {
      return this._state === PostPageState.Initial || this._state === PostPageState.Stopped;
    },
  });

  return store;
}

export function startLoadingPost(store: PostPageStore, api_client: APIClient, user_id: number, post_id: number): void {
  if (
    store._state !== PostPageState.Initial &&
    store._state !== PostPageState.Error &&
    store._state !== PostPageState.Stopped
  ) {
    throw new Error(`startLoadingPost called in invalid state: ${store._state}`);
  }

  store._state = PostPageState.Loading;

  const abort_controller = new AbortController();
  store._abort_controller = ref(abort_controller);

  const promise_resolve = store._promise_resolve;
  const promise_reject = store._promise_reject;

  (async () => {
    try {
      const feed = api_client.getPostFeed({ userId: user_id, postId: post_id }, { signal: abort_controller.signal });

      for await (const response of feed) {
        if (
          store._state === PostPageState.Loading &&
          response.result.case === "success" &&
          response.result.value.event.case === "initialPost"
        ) {
          store._state = PostPageState.Live;
          promise_resolve();
        }

        handle_feed_event(store, response);
      }
    } catch (err) {
      if (err instanceof ConnectError && err.code === Code.Canceled) {
        // Aborted, expected
      } else {
        store._state = PostPageState.Error;
        promise_reject();
        console.error("Error loading post feed:", err);
      }
    }
  })();
}

export function stopLoadingPost(store: PostPageStore): void {
  if (store._state !== PostPageState.Loading && store._state !== PostPageState.Live) {
    throw new Error(`stopLoadingPost called in invalid state: ${store._state}`);
  }

  invariant(store._abort_controller !== null);
  store._abort_controller.abort();
  store._abort_controller = null;

  store._state = PostPageState.Stopped;
  store.post = null;
  store.comments.clear();
  store.rootComments = [];

  // Pre-create the promise for the next loading cycle so React's use() can
  // cache it — promises created during render trigger an "uncached promise" warning
  const [promise, promise_resolve, promise_reject] = make_promise();
  store.promise = ref(promise);
  store._promise_resolve = promise_resolve;
  store._promise_reject = promise_reject;
}

function make_promise(): [Promise<void>, () => void, (reason?: unknown) => void] {
  let promise_resolve!: () => void;
  let promise_reject!: (reason?: unknown) => void;

  const promise = new Promise<void>((resolve, reject) => {
    promise_resolve = resolve;
    promise_reject = reject;
  });

  return [promise, promise_resolve, promise_reject];
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
