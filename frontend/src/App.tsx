import { createStore, postsFSM, userFSM } from "./state.ts";
import { StoreProvider } from "./contexts/store.tsx";
import PostsPage from "./pages/PostsPage.tsx";
import { createAPIClient } from "./api-client.ts";

function App() {
  const store = createStore();
  const api_client = createAPIClient();

  userFSM(store, api_client, "loading");
  postsFSM(store, api_client, "loading");

  return (
    <StoreProvider store={store}>
      <PostsPage />
    </StoreProvider>
  );
}

export default App;
