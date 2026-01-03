import process from "node:process";
import { fastify } from "fastify";
import { create } from "@bufbuild/protobuf";
import type { ConnectRouter } from "@connectrpc/connect";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";

import {
  BakerNewsService,
  ArticleSchema,
  ArticleListSchema,
  UserSchema,
  UserRole,
  GetArticleListResponseSchema,
  GetArticleResponseSchema,
} from "./proto/gen/baker-news_pb.ts";

export const routes = (router: ConnectRouter) =>
  router.service(BakerNewsService, {
    getArticleList(_req) {
      console.log("Requesting article list");

      const author = create(UserSchema, {
        id: 1234,
        name: "John Doe",
        role: UserRole.ADMIN,
        createdAt: {
          seconds: BigInt(1234567890),
          nanos: 123456789,
        },
      });

      const article1 = create(ArticleSchema, {
        id: 0,
        title: "Hello Article!",
        url: "https://example.com",
        score: 100,
        author,
      });

      const article2 = create(ArticleSchema, {
        id: 1,
        title: "Hello Article 2!",
        url: "https://example.com",
        score: 10,
        author,
      });

      const articleList = create(ArticleListSchema, {
        articles: [article1, article2],
      });

      return create(GetArticleListResponseSchema, { articleList: articleList });
    },
    getArticle(req) {
      console.log("Requesting article with id", req.id);

      const author = create(UserSchema, {
        id: 1234,
        name: "John Doe",
        role: UserRole.ADMIN,
        createdAt: {
          seconds: BigInt(1234567890),
          nanos: 123456789,
        },
      });

      const article = create(ArticleSchema, {
        id: 1234,
        title: "Hello Article!",
        url: "https://example.com",
        score: 100,
        author,
      });

      return create(GetArticleResponseSchema, { article });
    },
  });

async function main() {
  const server = fastify({ logger: true });
  await server.register(fastifyConnectPlugin, { routes });

  server.get("/", (_, reply) => {
    reply.type("text/plain");
    reply.send("Hello World!");
  });

  try {
    await server.listen({ host: "localhost", port: 8080 });
  } catch (err) {
    server.log.error("Error", err);
    process.exit(1);
  }

  console.log("server is listening at", server.addresses());
}

if (import.meta.main) {
  main();
}

/*
curl \
  --header 'Content-Type: application/json' \
  --data '{}' \
   http://localhost:8080/BakerNews.BakerNewsService/GetArticleList

curl \
  --header 'Content-Type: application/json' \
  --data '{"id": 123}' \
   http://localhost:8080/BakerNews.BakerNewsService/GetArticle

*/
