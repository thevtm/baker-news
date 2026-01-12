import type { Meta, StoryObj } from "@storybook/react";

import PostList from "./PostList";
import { Post, UserRole, createStore } from "../state";
import { StoreProvider } from "../contexts/store";
import { createAPIClient } from "../api-client";
import { APIClientProvider } from "../contexts/api-client";

const meta: Meta<typeof PostList> = {
  component: PostList,
};

export default meta;
type Story = StoryObj<typeof PostList>;

const posts: Post[] = [
  {
    id: 1,
    title: "Hello Post!",
    url: "https://example.com",
    author: { id: 1, username: "Alice", role: UserRole.User },
    score: 42,
    commentsCount: 3,
    createdAt: new Date("2021-09-01"),
  },
];

export const Primary: Story = {
  args: {
    posts,
  },
  decorators: [
    (Story) => {
      const store = createStore();
      return (
        <StoreProvider store={store}>
          <Story />
        </StoreProvider>
      );
    },
    (Story) => {
      const api_client = createAPIClient();
      return (
        <APIClientProvider apiClient={api_client}>
          <Story />
        </APIClientProvider>
      );
    },
  ],
};
