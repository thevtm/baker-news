import { proxy, ref } from "valtio";
import invariant from "tiny-invariant";

import * as proto from "../proto/index.ts";
import { APIClient } from "../api-client.ts";
import { Code, ConnectError } from "@connectrpc/connect";

export enum PostsPageState {
  Initial = "initial",
  Error = "error",
  Loading = "loading",
  Live = "live",
}

export interface PostsPageStore {
  state: PostsPageState;
  posts: proto.Post[];
  promise: Promise<void> | null;
  abort_controller: AbortController | null;
}

export function makePostsPageStore(): PostsPageStore {
  const store = proxy<PostsPageStore>({
    state: PostsPageState.Initial,
    posts: [],
    promise: null,
    abort_controller: null,
  });

  return store;
}

export async function startLoadingPosts(store: PostsPageStore, api_client: APIClient, user_id: number): Promise<void> {
  if (store.state !== PostsPageState.Initial && store.state !== PostsPageState.Error) return;

  // Set up abort controller up front so stopLoadingPosts can cancel at any stage
  const abort_controller = new AbortController();
  store.abort_controller = ref(abort_controller);
  store.state = PostsPageState.Loading;

  // Request
  const response_promise = api_client.getPosts({ userId: user_id }, { signal: abort_controller.signal });
  store.promise = ref(response_promise as unknown as Promise<void>);
  const response = await response_promise;

  // Aborted during initial fetch
  if (abort_controller.signal.aborted) {
    store.promise = null;
    store.abort_controller = null;
    return;
  }

  // Error
  if (response.result.case === "error") {
    console.error("Error loading posts:", response.result.value);
    store.state = PostsPageState.Error;
    store.promise = null;
    store.abort_controller = null;
    return;
  }

  // Success
  invariant(response.result.case === "success");
  invariant(Array.isArray(response.result.value.postList?.posts));
  store.posts = response.result.value.postList!.posts;
  sort_posts(store);

  // Set up subscription for live updates (reuses the same abort controller)
  (async () => {
    try {
      const feed = api_client.getPostsFeed({ userId: user_id }, { signal: abort_controller.signal });
      for await (const response of feed) handle_get_posts_feed_event(store, response);
    } catch (err) {
      if (err instanceof ConnectError && err.code === Code.Canceled) {
        // Aborted, expected
      } else {
        throw err;
      }
    }
  })();

  store.state = PostsPageState.Live;
  store.promise = null;
}

export function stopLoadingPosts(store: PostsPageStore): void {
  if (store.state !== PostsPageState.Loading && store.state !== PostsPageState.Live) return;

  invariant(store.abort_controller !== null);
  store.abort_controller.abort("Stopped loading posts");
  store.abort_controller = null;
  store.promise = null;

  store.state = PostsPageState.Initial;
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
