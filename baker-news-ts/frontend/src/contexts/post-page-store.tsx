import { createContext, ReactNode } from "react";

import { PostPageStore } from "../state/post-page-store.ts";

export const PostPageStoreContext = createContext<PostPageStore | null>(null);

type PostPageStoreProviderProps = {
  store: PostPageStore;
  children: ReactNode;
};

export const PostPageStoreProvider = ({ store, children }: PostPageStoreProviderProps) => (
  <PostPageStoreContext.Provider value={store}>{children}</PostPageStoreContext.Provider>
);
