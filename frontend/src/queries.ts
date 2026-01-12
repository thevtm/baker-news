import _ from "lodash";
import invariant from "tiny-invariant";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { PersistedClient } from "@tanstack/react-query-persist-client";
import { fromJson, toJson } from "@bufbuild/protobuf";

import * as proto from "./proto";
import { useAPIClient } from "./contexts/api-client";

const DISABLE_QUERY_REFRESH = {
  gcTime: Infinity,
  staleTime: Infinity,
};

export function useUser(): proto.User {
  const api_client = useAPIClient();

  const { data } = useSuspenseQuery({
    ...DISABLE_QUERY_REFRESH,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    queryKey: [proto.BakerNewsService.typeName, proto.BakerNewsService.method.createUser.name],
    queryFn: async () => {
      const random_username = `User-${Math.floor(Math.random() * 10000)}`;
      const response = await api_client.createUser({ username: random_username });

      if (response.result.case === "error") {
        throw new Error(`Failed to create a random user: ${response.result.value.message}`);
      }

      invariant(response.result.case === "success");

      return response.result.value.user!;
    },
  });

  return data;
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

export function getPostsQueryKey(user_id: number) {
  return [proto.BakerNewsService.typeName, proto.BakerNewsService.method.getPosts.name, user_id];
}

export function usePosts(user_id: number): proto.GetPostsResponse {
  const api_client = useAPIClient();

  const { data } = useSuspenseQuery({
    queryKey: getPostsQueryKey(user_id),
    queryFn: () => api_client.getPosts({ userId: user_id }),
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
