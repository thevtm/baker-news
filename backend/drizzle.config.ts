import { defineConfig } from "drizzle-kit";

import { credentials } from "./src/credentials.ts";

export default defineConfig({
  out: "./src/db/gen",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: credentials.database_url,
    ssl: false,
  },
});
