import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";

import { BakerNewsService } from "./proto";

export type APIClient = ReturnType<typeof createAPIClient>;

export function createAPIClient() {
  const transport = createConnectTransport({
    baseUrl: "http://localhost:8080",
    useHttpGet: false,
  });

  return createClient(BakerNewsService, transport);
}
