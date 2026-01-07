import { fastify } from "fastify";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";

import { db } from "./db/index.ts";
import { createRoutes } from "./connect.ts";

async function main() {
  const routes = createRoutes(db);

  const server = fastify({ logger: true });
  await server.register(fastifyConnectPlugin, { routes });

  try {
    await server.listen({ host: "localhost", port: 8080 });
  } catch (err) {
    console.error("Server error:", err);
    Deno.exit(-1);
  }

  console.log("server is listening at", server.addresses());
}

main().catch((err) => {
  console.error("Error executing main function:", err);
  Deno.exit(-1);
});
