import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import type { Timestamp } from "@bufbuild/protobuf/wkt";

import { BakerNewsService } from "../../backend/src/proto/index.ts";

export type APIClient = ReturnType<typeof createAPIClient>;

export function createAPIClient() {
  const transport = createConnectTransport({
    baseUrl: "http://localhost:8080",
    useHttpGet: false,
  });

  return createClient(BakerNewsService, transport);
}

export function convertDate(timestamp: Timestamp): Date {
  return new Date(Number(timestamp.seconds * 1000n));
}
