import { integer, pgTable, varchar, timestamp, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { utils } from "./index.ts";

/* COMMON */

const timestamps = {
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
};

const soft_delete = {
  deletedAt: timestamp("deleted_at"),
};

// Source https://github.com/drizzle-team/drizzle-orm/discussions/1914
export function enumToPgEnum<T extends { [key: string]: string }>(myEnum: T): [T[keyof T], ...T[keyof T][]] {
  const values = Object.values(myEnum) as T[keyof T][];
  return values as [T[keyof T], ...T[keyof T][]]; // forces non-empty array
}

/* ENUMS */

export enum Roles {
  GUEST = "guest",
  USER = "user",
  ADMIN = "admin",
}

export const roles = pgEnum("roles", enumToPgEnum(Roles));

export enum VoteType {
  NO_VOTE = "no_vote",
  UP_VOTE = "up_vote",
  DOWN_VOTE = "down_vote",
}

export const voteTypes = pgEnum("vote_types", enumToPgEnum(VoteType));

/* SCHEMA */

export const users = pgTable(
  "users",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    username: varchar({ length: 255 }).notNull(),
    role: roles().notNull(),

    ...timestamps,
  },
  (table) => [uniqueIndex("users_username_idx").on(utils.lower(table.username))]
);

export const posts = pgTable("posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

  title: varchar({ length: 255 }).notNull(),
  url: varchar({ length: 2048 }).notNull(),

  authorId: integer("author_id")
    .notNull()
    .references(() => users.id),

  score: integer().notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),

  ...timestamps,
  ...soft_delete,
});

export const comments = pgTable(
  "comments",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    content: varchar({ length: 1000 }).notNull(),

    postId: integer("post_id")
      .notNull()
      .references(() => posts.id),
    parentCommentId: integer("parent_comment_id"),

    authorId: integer("author_id")
      .notNull()
      .references(() => users.id),

    score: integer().notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),

    ...timestamps,
    ...soft_delete,
  },
  (table) => [
    index("comments_post_idx").on(table.postId),
    index("comments_parent_comment_idx").on(table.parentCommentId),
  ]
);

export const commentsRelations = relations(comments, ({ one }) => ({
  parentComment: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
  }),
}));

export const postVotes = pgTable(
  "post_votes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    postId: integer("post_id")
      .notNull()
      .references(() => posts.id),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id),

    voteType: voteTypes("vote_type").notNull(),

    ...timestamps,
  },
  (table) => [
    index("post_votes_post_idx").on(table.postId),
    index("post_votes_user_idx").on(table.userId),
    index("post_votes_user_post_idx").on(table.userId, table.postId),
  ]
);

export const commentVotes = pgTable(
  "comment_votes",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id),

    userId: integer("user_id")
      .notNull()
      .references(() => users.id),

    voteType: voteTypes("vote_type").notNull(),

    ...timestamps,
  },
  (table) => [
    index("comment_votes_comment_idx").on(table.commentId),
    index("comment_votes_user_idx").on(table.userId),
    index("comment_votes_user_comment_idx").on(table.userId, table.commentId),
  ]
);
