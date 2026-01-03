import { drizzle } from "drizzle-orm/node-postgres";
import { credentials } from "../credentials.ts";

type Schema = Record<string, never>;

const database_url = Deno.env.get("DATABASE_URL_OVERRIDE") ?? credentials.database_url;
if (!database_url) throw new Error("Database URL is missing!");

export const db = drizzle<Schema>(database_url, { logger: true, casing: "snake_case" });

export type DB = typeof db;

export type Tx = Parameters<Parameters<DB["transaction"]>[0]>[0];

export type DBOrTx = DB | Tx;
