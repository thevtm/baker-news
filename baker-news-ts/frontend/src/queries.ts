import _ from "lodash";
import invariant from "tiny-invariant";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistedClient } from "@tanstack/react-query-persist-client";
import { fromJson, toJson } from "@bufbuild/protobuf";

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

export function getPostQueryKey(user_id: number, post_id: number) {
  return [proto.BakerNewsService.typeName, proto.BakerNewsService.method.getPost.name, user_id, post_id];
}

export function usePost(user_id: number, post_id: number): proto.GetPostResponse {
  const api_client = useAPIClient();

  const { data } = useSuspenseQuery({
    queryKey: getPostQueryKey(user_id, post_id),
    queryFn: () => api_client.getPost({ userId: user_id, postId: post_id }),
  });

  return data;
}

type ProtoQuerySchemaTypes = proto.User | proto.GetPostsResponse | proto.GetPostResponse;

const PROTO_QUERIES_SERIALIZATION_MAP = {
  [proto.BakerNewsService.method.createUser.name]: proto.UserSchema,
  [proto.BakerNewsService.method.getPost.name]: proto.GetPostResponseSchema,
  [proto.BakerNewsService.method.getPosts.name]: proto.GetPostsResponseSchema,
} as const;

export function createLocalStoragePersister() {
  const serialize = (data: PersistedClient) => {
    try {
      // Serialize Protobuf data
      for (let i = 0; i < data.clientState.queries.length; i++) {
        const query = data.clientState.queries[i];

        if (query.queryKey.length < 2) continue;
        if (query.queryKey[0] !== proto.BakerNewsService.typeName) continue;
        if (!_.isString(query.queryKey[1])) continue;

        const method_name: string = query.queryKey[1];
        const schema = PROTO_QUERIES_SERIALIZATION_MAP[method_name];

        invariant(schema !== undefined, `Unknown method name: ${method_name}`);

        const query_data = query.state.data;
        const data_json = toJson(schema, query_data as ProtoQuerySchemaTypes);
        query.state.data = data_json;
      }

      return JSON.stringify(data);
    } catch (e) {
      console.error("Error serializing data:", e, data);
      throw e;
    }
  };

  const deserialize = (data_str: string) => {
    try {
      // Deserialize Protobuf data
      const data = JSON.parse(data_str) satisfies PersistedClient;

      for (let i = 0; i < data.clientState.queries.length; i++) {
        const query = data.clientState.queries[i];

        if (query.queryKey.length < 2) continue;
        if (query.queryKey[0] !== proto.BakerNewsService.typeName) continue;
        if (!_.isString(query.queryKey[1])) continue;

        const method_name: string = query.queryKey[1];
        const schema = PROTO_QUERIES_SERIALIZATION_MAP[method_name];

        invariant(schema !== undefined, `Unknown method name: ${method_name}`);

        const query_data = query.state.data;
        const data_json = fromJson(schema, query_data);
        query.state.data = data_json;
      }

      return data;
    } catch (e) {
      console.error("Error deserializing data:", e, data_str);
      throw e;
    }
  };

  return createSyncStoragePersister({
    storage: window.localStorage,
    serialize,
    deserialize,
  });
}
