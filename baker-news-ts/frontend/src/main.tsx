import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { createRouter, RouterProvider } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { persistQueryClient } from "@tanstack/react-query-persist-client";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { createAPIClient } from "./api-client.ts";
import { APIClientProvider } from "./contexts/api-client.tsx";
import { routeTree } from "./routeTree.gen";
import { createLocalStoragePersister } from "./queries.ts";
import { makeUserStore } from "./state/user-store.ts";
import { UserStoreProvider } from "./contexts/user-store.tsx";

import "./css/reset.css";

// API Client
const api_client = createAPIClient();

// Stores
const user_store = makeUserStore();

// Queries
const queryClient = new QueryClient();
const persister = createLocalStoragePersister();

persistQueryClient({ queryClient, persister });

// Router
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const router = createRouter({ routeTree, defaultPendingComponent: () => <div>Loading...</div> });

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <APIClientProvider apiClient={api_client}>
      <QueryClientProvider client={queryClient}>
        <UserStoreProvider store={user_store}>
          <RouterProvider router={router} />
          <ReactQueryDevtools />
        </UserStoreProvider>
      </QueryClientProvider>
    </APIClientProvider>
  </StrictMode>,
);
