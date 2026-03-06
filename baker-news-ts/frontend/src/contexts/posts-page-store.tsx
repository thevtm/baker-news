import { createContext, ReactNode } from "react";

import { PostsPageStore } from "../state/posts-page-store.ts";

export const PostsPageStoreContext = createContext<PostsPageStore | null>(null);

type PostsPageStoreProviderProps = {
  store: PostsPageStore;
  children: ReactNode;
};

export const PostsPageStoreProvider = ({ store, children }: PostsPageStoreProviderProps) => (
  <PostsPageStoreContext.Provider value={store}>{children}</PostsPageStoreContext.Provider>
);
