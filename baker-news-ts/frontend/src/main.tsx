import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { createAPIClient } from "./api-client.ts";
import { APIClientProvider } from "./contexts/api-client.tsx";
import { routeTree } from "./routeTree.gen";
import { makeUserStore } from "./state/user-store.ts";
import { UserStoreProvider } from "./contexts/user-store.tsx";

import "./css/reset.css";

// API Client
const api_client = createAPIClient();

// Stores
const user_store = makeUserStore();

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
      <UserStoreProvider store={user_store}>
        <RouterProvider router={router} />
      </UserStoreProvider>
    </APIClientProvider>
  </StrictMode>,
);
