import { proxy } from "valtio";

export enum VoteType {
  Up,
  Down,
}

export type User = {
  id: number;
  name: string;
  role: "admin" | "user";
};

export type Post = {
  id: number;
  title: string;
  url: string;
  author: User;
  votes: number;
  commentsCount: number;
  createdAt: Date;
};

export type Comment = {
  id: number;
  author: User;
  content: string;
  votes: number;
  createdAt: Date;
  postId: number;
  parentId?: number;
};

const initial_posts: Post[] = [
  {
    id: 1,
    title: "Hello, World!",
    url: "https://example.com",
    author: { id: 1, name: "Alice", role: "admin" },
    votes: 42,
    commentsCount: 3,
    createdAt: new Date("2021-09-01"),
  },
  {
    id: 2,
    title: "Hello, Mars!",
    url: "https://potate.com",
    author: { id: 2, name: "Bob", role: "user" },
    votes: -2,
    commentsCount: 0,
    createdAt: new Date("2024-10-10"),
  },
];

export const posts = proxy<Record<number, Post>>(initial_posts);

export type Page =
  | { page: "top_posts" }
  | { page: "new_posts" }
  | { page: "post"; post_id: number };

export const navigation_state = proxy<Page>({ page: "top_posts" });
