import { Post } from "../state";

import PostList from "../components/PostList";
import PageLayout from "./PageLayout";

const FAKE_POSTS: Post[] = [
  {
    id: 0,
    title: "Hello, World!",
    url: "https://www.example.com/about",
    author: { id: 1, name: "Alice", role: "admin" },
    votes: 42,
    commentsCount: 3,
    createdAt: new Date("2021-09-01"),
  },
  {
    id: 1,
    title: "Come to the Dark Side!",
    url: "https://cookies.com",
    author: { id: 2, name: "Bob", role: "user" },
    votes: 102,
    commentsCount: 30,
    createdAt: new Date("2023-10-10"),
  },
];

const PostsPage: React.FC = () => {
  return (
    <PageLayout userName="John Doe">
      <PostList posts={FAKE_POSTS} />
    </PageLayout>
  );
};

export default PostsPage;
