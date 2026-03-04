import { createContext, ReactNode, useContext } from "react";

import { UserStore } from "../state/user-store.ts";

const UserStoreContext = createContext<UserStore | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useUserStore = (): UserStore => {
  const context = useContext(UserStoreContext);
  if (!context) {
    throw new Error("useUserStore must be used within a UserStoreProvider");
  }
  return context;
};

type UserStoreProviderProps = {
  store: UserStore;
  children: ReactNode;
};

export const UserStoreProvider = ({ store, children }: UserStoreProviderProps) => (
  <UserStoreContext.Provider value={store}>{children}</UserStoreContext.Provider>
);
