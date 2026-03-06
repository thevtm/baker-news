import invariant from "tiny-invariant";
import { useSnapshot } from "valtio";
import { use } from "react";

import * as proto from "./proto";
import { useAPIClient } from "./contexts/api-client";
import { useUserStore } from "./contexts/user-store";
import { userSignIn } from "./state/user-store";

export function useUser(): proto.User {
  const api_client = useAPIClient();
  const user_store = useUserStore();

  const user_snap = useSnapshot(user_store);

  if (user_snap.user === null) {
    userSignIn(user_store, api_client);
  }

  use(user_snap.promise);

  invariant(user_store.user !== null);
  return user_store.user;
}
