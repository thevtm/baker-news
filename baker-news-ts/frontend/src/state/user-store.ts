import { proxy, ref } from "valtio";
import invariant from "tiny-invariant";
import { fromJsonString, toJsonString } from "@bufbuild/protobuf";

import * as proto from "../proto/index.ts";
import { APIClient } from "../api-client.ts";

export enum UserStoreState {
  Initial = "initial",
  Error = "error",
  SignedIn = "signed_in",
  SigningIn = "signing_in",
}

export interface UserStore {
  user: proto.User | null;
  promise: Promise<void>;
  signInRequested: boolean;
  _promise_resolve: () => void;
  _promise_reject: (reason?: unknown) => void;
  _state: UserStoreState;
}

export function makeUserStore(): UserStore {
  let promise_resolve!: () => void;
  let promise_reject!: (reason?: unknown) => void;

  const promise = new Promise<void>((resolve, reject) => {
    promise_resolve = resolve;
    promise_reject = reject;
  });

  const store = proxy<UserStore>({
    user: null,
    promise: ref(promise),

    get signInRequested() {
      return this._state !== UserStoreState.Initial;
    },

    _promise_resolve: promise_resolve,
    _promise_reject: promise_reject,
    _state: UserStoreState.Initial,
  });

  return store as UserStore;
}

export async function userSignIn(store: UserStore, api_client: APIClient): Promise<void> {
  if (store._state !== UserStoreState.Initial) return;
  store._state = UserStoreState.SigningIn;

  // Check localStorage for existing user
  const stored_user_json = localStorage.getItem("user");

  if (stored_user_json !== null) {
    const stored_user = fromJsonString(proto.UserSchema, stored_user_json);
    store._state = UserStoreState.SignedIn;
    store.user = stored_user;
    store._promise_resolve();
    return;
  }

  // Create a random user
  const username_number = Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, "0");

  const random_username = `User-${username_number}`;

  const response = await api_client.createUser({ username: random_username });

  // Error
  if (response.result.case === "error") {
    store._state = UserStoreState.Error;
    store._promise_reject(new Error("Failed to create user"));
    return;
  }

  // Success
  invariant(response.result.case === "success");
  invariant(response.result.value.user !== undefined);

  const user = response.result.value.user;

  localStorage.setItem("user", toJsonString(proto.UserSchema, user));

  store._state = UserStoreState.SignedIn;
  store.user = user;
  store._promise_resolve();
}

export async function userReset(store: UserStore, api_client: APIClient): Promise<void> {
  if (store._state !== UserStoreState.SignedIn) return;

  localStorage.removeItem("user");

  store._state = UserStoreState.Initial;
  store.user = null;

  let promise_resolve!: () => void;
  let promise_reject!: (reason?: unknown) => void;

  const promise = new Promise<void>((resolve, reject) => {
    promise_resolve = resolve;
    promise_reject = reject;
  });

  store.promise = ref(promise);
  store._promise_resolve = promise_resolve;
  store._promise_reject = promise_reject;

  await userSignIn(store, api_client);
}
