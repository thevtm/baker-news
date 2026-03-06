import { createContext, ReactNode } from "react";

import { UserStore } from "../state/user-store.ts";

export const UserStoreContext = createContext<UserStore | null>(null);

type UserStoreProviderProps = {
  store: UserStore;
  children: ReactNode;
};

export const UserStoreProvider = ({ store, children }: UserStoreProviderProps) => (
  <UserStoreContext.Provider value={store}>{children}</UserStoreContext.Provider>
);
