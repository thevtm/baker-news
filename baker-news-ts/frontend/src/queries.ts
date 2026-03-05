import invariant from "tiny-invariant";

import * as proto from "./proto";
import { useAPIClient } from "./contexts/api-client";
import { useUserStore } from "./contexts/user-store";
import { userSignIn, UserStoreState } from "./state/user-store";
import { useSnapshot } from "valtio";

export function useUser(): proto.User {
  const api_client = useAPIClient();
  const user_store = useUserStore();

  const user_snap = useSnapshot(user_store);

  if (user_snap.state === UserStoreState.Initial) {
    userSignIn(user_store, api_client);
  }

  if (user_snap.state === UserStoreState.Error) {
    throw new Error("Failed to sign in");
  }

  if (user_snap.state === UserStoreState.SigningIn) {
    invariant(user_snap.promise !== null);
    throw user_snap.promise;
  }

  invariant(user_store.user !== null);
  return user_store.user;
}
