import { proxy } from "valtio";
import invariant from "tiny-invariant";

import * as proto from "../proto/index.ts";

export interface PostsPageStore {
  state: "initial" | "error" | "ready";
  posts: proto.Post[];
}

export function makePostsPageStore(): PostsPageStore {
  const store = proxy<PostsPageStore>({
    state: "initial",
    posts: [],
  });

  return store;
}

export function handleGetPostsFeedEvent(store: PostsPageStore, response: proto.GetPostsFeedResponse): void {
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
