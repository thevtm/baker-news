import { createContext, ReactNode, useContext } from "react";

import { Store } from "../state";

const StoreContext = createContext<Store | null>(null);

export const useStore = (): Store => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

type StoreProviderProps = {
  store: Store;
  children: ReactNode;
};

export const StoreProvider = ({ store, children }: StoreProviderProps) => (
  <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
);
