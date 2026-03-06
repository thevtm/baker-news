import { proxy, ref } from "valtio";
import invariant from "tiny-invariant";
import { Code, ConnectError } from "@connectrpc/connect";

import * as proto from "../proto/index.ts";
import { APIClient } from "../api-client.ts";

enum PostsPageState {
  Initial = "initial",
  Error = "error",
  Loading = "loading",
  Live = "live",
  Stopped = "stopped",
}

export interface PostsPageStore {
  posts: proto.Post[];
  promise: Promise<void>;
  isIdle: boolean;
  _abort_controller: AbortController | null;
  _state: PostsPageState;
  _promise_resolve: () => void;
  _promise_reject: (reason?: unknown) => void;
}

export function makePostsPageStore(): PostsPageStore {
  const [promise, promise_resolve, promise_reject] = make_promise();

  const store = proxy<PostsPageStore>({
    posts: [],
    promise: ref(promise),

    _state: PostsPageState.Initial,
    _promise_resolve: promise_resolve,
    _promise_reject: promise_reject,
    _abort_controller: null,

    get isIdle() {
      return this._state === PostsPageState.Stopped || this._state === PostsPageState.Initial;
    },
  });

  return store;
}

export function startLoadingPosts(store: PostsPageStore, api_client: APIClient, user_id: number): void {
  if (
    store._state !== PostsPageState.Initial &&
    store._state !== PostsPageState.Error &&
    store._state !== PostsPageState.Stopped
  ) {
    throw new Error(`startLoadingPosts called in invalid state: ${store._state}`);
  }

  const abort_controller = new AbortController();
  store._abort_controller = ref(abort_controller);
  store._state = PostsPageState.Loading;

  (async () => {
    try {
      const feed = api_client.getPostsFeed({ userId: user_id }, { signal: abort_controller.signal });
      for await (const response of feed) {
        if (
          store._state === PostsPageState.Loading &&
          response.result.case === "success" &&
          response.result.value.event.case === "initialPosts"
        ) {
          store._state = PostsPageState.Live;
          store._promise_resolve();
        }

        handle_get_posts_feed_event(store, response);
      }
    } catch (err) {
      if (err instanceof ConnectError && err.code === Code.Canceled) {
        // Aborted, expected
      } else {
        store._state = PostsPageState.Error;
        store._promise_reject();
        console.error("Error loading posts feed:", err);
      }
    }
  })();
}

export function stopLoadingPosts(store: PostsPageStore): void {
  if (store._state !== PostsPageState.Loading && store._state !== PostsPageState.Live) return;

  invariant(store._abort_controller !== null);
  store._abort_controller.abort();
  store._abort_controller = null;

  store._state = PostsPageState.Stopped;
  store.posts = [];

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

function handle_get_posts_feed_event(store: PostsPageStore, response: proto.GetPostsFeedResponse): void {
  invariant(response.result.case === "success");

  const event: proto.GetPostsFeedSuccessfulResponse["event"] = response.result.value.event;

  if (event.case === "initialPosts") {
    store.posts = event.value.posts;
    sort_posts(store);
  } else if (event.case === "postCreated") {
    store.posts.push(event.value.post!);
    sort_posts(store);
  } else if (event.case === "postDeleted") {
    const postId = (event.value satisfies proto.PostDeleted).postId;
    invariant(postId !== undefined);
    store.posts = store.posts.filter((post) => post.id !== postId);
  } else if (event.case === "postScoreChanged") {
    handle_post_score_changed(event.value, store);
    sort_posts(store);
  } else if (event.case === "userVotedPost") {
    handle_user_voted_post(event.value, store);
    sort_posts(store);
  } else {
    console.error("Unknown event type:", event.case);
  }
}

function handle_user_voted_post(event: proto.UserVotedPost, store: PostsPageStore) {
  const post = store.posts.find((p) => p.id === event.vote!.postId);

  invariant(post !== undefined);

  post.score = event.newScore;
  post.vote = event.vote;
  post.score = event.newScore;
}

function handle_post_score_changed(event: proto.PostScoreChanged, store: PostsPageStore): void {
  const post = store.posts.find((p) => p.id === event.postId);

  invariant(post !== undefined);

  post.score = event.newScore;
}

function sort_posts(store: PostsPageStore): void {
  store.posts.sort((a, b) => b.score - a.score);
}
