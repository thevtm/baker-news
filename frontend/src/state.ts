import { proxy } from "valtio";
import invariant from "tiny-invariant";

import { UserRole as ProtoUserRole, VoteType as ProtoVoteType } from "../../backend/src/proto";

import { APIClient, convertDate } from "./api-client";

export enum VoteType {
  UpVote,
  DownVote,
  NoVote,
}

export const PROTO_TO_STATE_VOTE_TYPE_MAP = new Map<ProtoVoteType, VoteType>([
  [ProtoVoteType.UP_VOTE, VoteType.UpVote],
  [ProtoVoteType.DOWN_VOTE, VoteType.DownVote],
  [ProtoVoteType.NO_VOTE, VoteType.NoVote],
]);

export const STATE_TO_PROTO_VOTE_TYPE_MAP = new Map<VoteType, ProtoVoteType>([
  [VoteType.UpVote, ProtoVoteType.UP_VOTE],
  [VoteType.DownVote, ProtoVoteType.DOWN_VOTE],
  [VoteType.NoVote, ProtoVoteType.NO_VOTE],
]);

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
  vote?: PostVote;
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

export type PostVote = {
  id: number;
  userId: number;
  postId: number;
  voteType: VoteType;
  createdAt: Date;
  updatedAt: Date;
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

function convertUserRole(role: ProtoUserRole): UserRole {
  switch (role) {
    case ProtoUserRole.ADMIN:
      return UserRole.Admin;
    case ProtoUserRole.USER:
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

  throw new Error(`Invalid state transition: ${current_state} => ${desired_state}`);
}

export async function postsFSM(store: Store, api_client: APIClient, desired_state: DataLinkState) {
  const current_state = store.dataLinkState;

  invariant(current_state !== desired_state, "State is already in the desired state");

  // Initial | Stopped => Loading
  if ((current_state === "initial" || current_state === "stopped") && desired_state === "loading") {
    const posts_response = await api_client.getPostList({ userId: store.user?.id });

    if (posts_response.result.case === "error") {
      store.dataLinkState = "error";
      return;
    }

    invariant(posts_response.result.case === "success");
    invariant(posts_response.result.value!.postList!.Posts !== undefined);

    const posts = posts_response.result.value!.postList!.Posts;
    store.posts = [];

    for (const post of posts) {
      let vote: PostVote | undefined = undefined;

      if (post.vote !== undefined) {
        vote = {
          id: post.vote.id,
          userId: post.vote.userId,
          postId: post.vote.postId,
          voteType: PROTO_TO_STATE_VOTE_TYPE_MAP.get(post.vote.voteType)!,
          createdAt: convertDate(post.vote.createdAt!),
          updatedAt: convertDate(post.vote.updatedAt!),
        };
      }

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
        vote,
        createdAt: convertDate(post.createdAt!),
      });
    }

    store.dataLinkState = "loading";
  }

  throw new Error(`Invalid state transition: ${current_state} => ${desired_state}`);
}

export async function votePost(store: Store, api_client: APIClient, post_id: number, vote_type: VoteType) {
  const user = store.user;

  invariant(user !== null, "User must be logged in to vote");

  const vote_response = await api_client.votePost({
    userId: user.id,
    postId: post_id,
    voteType: STATE_TO_PROTO_VOTE_TYPE_MAP.get(vote_type)!,
  });

  if (vote_response.result.case === "error") {
    throw new Error(`Failed to vote on post: ${vote_response.result.value.message}`);
  }

  invariant(vote_response.result.case === "success");

  const vote = vote_response.result.value!.vote;
  invariant(vote !== undefined);

  const post_vote: PostVote = {
    id: vote.id,
    userId: vote.userId,
    postId: vote.postId,
    voteType: PROTO_TO_STATE_VOTE_TYPE_MAP.get(vote.voteType)!,
    createdAt: convertDate(vote.createdAt!),
    updatedAt: convertDate(vote.updatedAt!),
  };

  const post_index = store.posts.findIndex((post) => post.id === post_id);
  invariant(post_index !== -1, "Post not found in store");

  const post = store.posts[post_index];

  post.vote = post_vote;
  post.score = vote_response.result.value.newScore;
}
