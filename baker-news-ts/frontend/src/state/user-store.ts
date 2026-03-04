import { proxy } from "valtio";
import invariant from "tiny-invariant";
import { fromJsonString, toJsonString } from "@bufbuild/protobuf";

import * as proto from "../proto/index.ts";
import { APIClient } from "../api-client.ts";

export enum UserStoreState {
  Initial = "initial",
  Error = "error",
  Ready = "ready",
  SigningIn = "signing_in",
}

export interface UserStore {
  state: UserStoreState;
  user: proto.User | null;
}

export function makeUserStore(): UserStore {
  const store = proxy<UserStore>({
    state: UserStoreState.Initial,
    user: null,
  });

  return store;
}

export async function userSignIn(store: UserStore, api_client: APIClient): Promise<void> {
  if (store.state !== UserStoreState.Initial) return;
  store.state = UserStoreState.SigningIn;

  // Check localStorage for existing user
  const stored_user_json = localStorage.getItem("user");

  if (stored_user_json !== null) {
    const stored_user = fromJsonString(proto.UserSchema, stored_user_json);
    store.state = UserStoreState.Ready;
    store.user = stored_user;
    return;
  }

  // Create a random user
  const username_number = Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");

  const random_username = `User-${username_number}`;

  const response = await api_client.createUser({ username: random_username });

  // Error
  if (response.result.case === "error") {
    console.error("Error creating user:", response.result.value);
    store.state = UserStoreState.Error;
    return;
  }

  // Success
  invariant(response.result.case === "success");
  invariant(response.result.value.user !== undefined);

  const user = response.result.value.user;

  localStorage.setItem("user", toJsonString(proto.UserSchema, user));

  store.state = UserStoreState.Ready;
  store.user = user;
}

export async function userReset(store: UserStore, api_client: APIClient): Promise<void> {
  store.state = UserStoreState.Initial;
  store.user = null;
  localStorage.removeItem("user");
  await userSignIn(store, api_client);
}
