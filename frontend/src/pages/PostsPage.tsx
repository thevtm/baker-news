import * as proto from "../proto";

import { PostList } from "../components/PostList";

export interface PostsPageProps {
  posts: proto.Post[];
}

export const PostsPage: React.FC<PostsPageProps> = ({ posts }) => {
  return <PostList posts={posts} />;
};
