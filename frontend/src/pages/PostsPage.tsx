import { useSnapshot } from "valtio";

import PostList from "../components/PostList";
import PageLayout from "./PageLayout";
import { useStore } from "../contexts/store";

const PostsPage: React.FC = () => {
  const store = useStore();
  const store_snap = useSnapshot(store);

  return (
    <PageLayout>
      <PostList posts={store_snap.posts} />
    </PageLayout>
  );
};

export default PostsPage;
