import type { Meta, StoryObj } from "@storybook/react";

import PostItem from "./PostItem";

const meta: Meta<typeof PostItem> = {
  component: PostItem,
};

export default meta;
type Story = StoryObj<typeof PostItem>;

export const Primary: Story = {
  args: {
    post: {
      id: 1,
      title: "Hello Post!",
      url: "https://example.com",
      author: { id: 1, username: "Alice", role: "admin" },
      score: 42,
      commentsCount: 3,
      createdAt: new Date("2021-09-01"),
    },
  },
};
