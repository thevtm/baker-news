import invariant from "tiny-invariant";
import { useSnapshot } from "valtio";
import { use, useContext } from "react";

import * as proto from "./proto";
import { useAPIClient } from "./contexts/api-client";
import { UserStoreContext } from "./contexts/user-store";
import { UserStore, userSignIn } from "./state/user-store";

export const useUserStore = (): UserStore => {
  const context = useContext(UserStoreContext);
  if (!context) {
    throw new Error("useUserStore must be used within a UserStoreProvider");
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
