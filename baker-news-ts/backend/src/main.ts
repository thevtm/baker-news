import { fastify } from "fastify";
import fastifyCors from "@fastify/cors";
import { cors as connectCors } from "@connectrpc/connect";
import { fastifyConnectPlugin } from "@connectrpc/connect-fastify";

import { db } from "./db/index.ts";
import { createEvents } from "./events/index.ts";
import { createRoutes } from "./connect/index.ts";
import { createQueries } from "./queries/index.ts";
import { makeEventListenerWorker } from "./events/worker.ts";

async function main() {
  const server = fastify({ logger: true });

  // Register the CORS plugin with the server
  await server.register(fastifyCors, {
    // Reflects the request origin. This should only be used for development.
    // Production should explicitly specify an origin
    origin: true,
    methods: [...connectCors.allowedMethods],
    allowedHeaders: [...connectCors.allowedHeaders],
    exposedHeaders: [...connectCors.exposedHeaders],
  });

  // Register the connect plugin with the server
  const queries = createQueries(db);
  const events = createEvents(queries);
  const routes = createRoutes(db, events);
  await server.register(fastifyConnectPlugin, { routes });

  // Start workers
  const eventListenerWorker = makeEventListenerWorker(db, queries, (e) => events.dispatch(e));

  eventListenerWorker().catch((err) => {
    console.error("Error in event listener worker:", err);
    Deno.exit(-1);
  });

  // Start the server
  try {
    await server.listen({ host: "localhost", port: 8080 });
  } catch (err) {
    console.error("Server error:", err);
    Deno.exit(-1);
  }

  console.log("server is listening at", server.addresses());
}

void main().catch((err) => {
  console.error("Error executing main function:", err);
  Deno.exit(-1);
});
