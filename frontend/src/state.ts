import { proxy } from "valtio";
import invariant from "tiny-invariant";

import { APIClient, convertDate } from "./api-client";
import { UserRole as UserRoleProto } from "../../backend/src/proto";

export enum VoteType {
  Up,
  Down,
}

export enum UserRole {
  Admin,
  User,
}

export type User = {
  id: number;
  username: string;
  role: UserRole;
};

export type Post = {
  id: number;
  title: string;
  url: string;
  author: User;
  score: number;
  commentsCount: number;
  createdAt: Date;
};

export type Comment = {
  id: number;
  author: User;
  content: string;
  votes: number;
  createdAt: Date;
  postId: number;
  parentId?: number;
};

export type NavigationState = { page: "posts" } | { page: "post"; post_id: number };

export type DataLinkState = "initial" | "loading" | "live" | "stopped" | "error";

export type Store = {
  user: User | null;
  userDataState: "initial" | "loading" | "error";
  navigationState: NavigationState;
  dataLinkState: DataLinkState;
  posts: Post[];
};

export function createStore(): Store {
  return proxy<Store>({
    user: null,
    userDataState: "initial",
    navigationState: { page: "posts" },
    dataLinkState: "initial",
    posts: [],
  });
}

function convertUserRole(role: UserRoleProto): UserRole {
  switch (role) {
    case UserRoleProto.ADMIN:
      return UserRole.Admin;
    case UserRoleProto.USER:
      return UserRole.User;
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}

export async function userFSM(store: Store, api_client: APIClient, desired_state: DataLinkState) {
  const current_state = store.dataLinkState;

  invariant(current_state !== desired_state, "State is already in the desired state");

  // Initial => Loading
  if (current_state === "initial" && desired_state === "loading") {
    const user_persisted = localStorage.getItem("user");

    if (user_persisted !== null) {
      // Already logged in
      store.user = JSON.parse(user_persisted) as User;
    } else {
      // Not logged in => create a new random user
      const random_username = `User-${Math.floor(Math.random() * 10000)}`;
      const random_user_response = await api_client.createUser({ username: random_username });

      if (random_user_response.result.case === "error") {
        store.userDataState = "error";
        throw new Error(`Failed to create a random user: ${random_user_response.result.value.message}`);
      }

      invariant(random_user_response.result.case === "success");
      invariant(random_user_response.result.value!.user !== undefined);

      const user_api = random_user_response.result.value!.user;

      invariant(user_api.username === random_username);

      const user: User = {
        id: user_api.id,
        username: user_api.username,
        role: convertUserRole(user_api.role),
      };

      store.user = user;
      localStorage.setItem("user", JSON.stringify(user));
    }

    store.userDataState = "loading";
  }
}

export async function postsFSM(store: Store, api_client: APIClient, desired_state: DataLinkState) {
  const current_state = store.dataLinkState;

  invariant(current_state !== desired_state, "State is already in the desired state");

  // Initial | Stopped => Loading
  if ((current_state === "initial" || current_state === "stopped") && desired_state === "loading") {
    const posts_response = await api_client.getPostList({});

    if (posts_response.result.case === "error") {
      store.dataLinkState = "error";
      return;
    }

    invariant(posts_response.result.case === "success");
    invariant(posts_response.result.value!.postList!.Posts !== undefined);

    const posts = posts_response.result.value!.postList!.Posts;
    store.posts = [];

    for (const post of posts) {
      store.posts.push({
        id: post.id,
        title: post.title,
        url: post.url,
        author: {
          id: post.author!.id,
          username: post.author!.username,
          role: convertUserRole(post.author!.role),
        },
        score: post.score,
        commentsCount: post.commentCount,
        createdAt: convertDate(post.createdAt!),
      });
    }

    store.dataLinkState = "loading";
  }
}
