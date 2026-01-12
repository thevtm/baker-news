import { createStore, postsFSM, userFSM } from "./state.ts";
import { StoreProvider } from "./contexts/store.tsx";
import PostsPage from "./pages/PostsPage.tsx";
import { createAPIClient } from "./api-client.ts";
import { APIClientProvider } from "./contexts/api-client.tsx";

function App() {
  const store = createStore();
  const api_client = createAPIClient();

  userFSM(store, api_client, "loading");
  postsFSM(store, api_client, "loading");

  return (
    <StoreProvider store={store}>
      <APIClientProvider apiClient={api_client}>
        <PostsPage />
      </APIClientProvider>
    </StoreProvider>
  );
}

export default App;
