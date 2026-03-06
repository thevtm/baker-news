import invariant from "tiny-invariant";
import { useSnapshot } from "valtio";
import { use, useContext } from "react";

import * as proto from "./proto";
import { APIClientContext } from "./contexts/api-client";
import { UserStoreContext } from "./contexts/user-store";
import { PostsPageStoreContext } from "./contexts/posts-page-store";
import { PostPageStoreContext } from "./contexts/post-page-store";
import { APIClient } from "./api-client";
import { UserStore, userSignIn } from "./state/user-store";
import { PostsPageStore, startLoadingPosts } from "./state/posts-page-store";
import { PostPageStore, PostPageComment, startLoadingPost } from "./state/post-page-store";

export const useAPIClient = (): APIClient => {
  const context = useContext(APIClientContext);
  if (!context) {
    throw new Error("useAPIClient must be used within an APIClientProvider");
  }
  return context;
};

export const useUserStore = (): UserStore => {
  const context = useContext(UserStoreContext);
  if (!context) {
    throw new Error("useUserStore must be used within a UserStoreProvider");
  }
  return context;
};

export const usePostsPageStore = (): PostsPageStore => {
  const context = useContext(PostsPageStoreContext);
  if (!context) {
    throw new Error("usePostsPageStore must be used within a PostsPageStoreProvider");
  }
  return context;
};

export const usePostPageStore = (): PostPageStore => {
  const context = useContext(PostPageStoreContext);
  if (!context) {
    throw new Error("usePostPageStore must be used within a PostPageStoreProvider");
  }
  return context;
};

export function useUser(): proto.User {
  const api_client = useAPIClient();
  const user_store = useUserStore();

  const user_snap = useSnapshot(user_store);

  if (!user_snap.signInRequested) {
    userSignIn(user_store, api_client);
  }

  use(user_snap.promise);

  invariant(user_store.user !== null);
  return user_store.user;
}

export function usePosts(): proto.Post[] {
  const api_client = useAPIClient();
  const user = useUser();

  const store = usePostsPageStore();
  const snap = useSnapshot(store);

  if (snap.isIdle) {
    startLoadingPosts(store, api_client, user.id);
  }

  use(snap.promise);

  return snap.posts as proto.Post[];
}

export function usePost(post_id: number): { post: proto.Post; rootComments: PostPageComment[] } {
  const api_client = useAPIClient();
  const user = useUser();

  const store = usePostPageStore();
  const snap = useSnapshot(store);

  if (snap.isIdle) {
    startLoadingPost(store, api_client, user.id, post_id);
  }

  use(snap.promise);

  invariant(store.post !== null);
  return { post: store.post, rootComments: snap.rootComments as PostPageComment[] };
}
