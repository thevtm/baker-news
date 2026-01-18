import * as proto from "../proto";

import { PostList } from "../components/PostList";
import CreatePostForm from "../components/CreatePostForm";

export interface PostsPageProps {
  posts: proto.Post[];
}

export const PostsPage: React.FC<PostsPageProps> = ({ posts }) => {
  return (
    <>
      <CreatePostForm />
      <PostList posts={posts} />
    </>
  );
};
