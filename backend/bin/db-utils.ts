import { $, ProcessPromise } from "zx";

import { credentials } from "../src/credentials.ts";

function getDatabaseName(): string {
  const databaseUrl = credentials.database_url;
  const url = new URL(databaseUrl);
  const path = url.pathname;
  const databaseName = path.substring(1); // Remove leading slash
  return databaseName;
}

function createPSQLCommand(sql_command: string): ProcessPromise {
  const compose_file_path = new URL("../compose.yml", new URL(".", import.meta.url)).pathname;
  return $`podman compose --file ${compose_file_path} exec postgres sh -c ${`psql -U postgres -c "${sql_command}"`}`;
}

async function createDatabase() {
  console.log("Creating database...");

  const database_name = getDatabaseName();
  const sql_command = `CREATE DATABASE ${database_name};`;

  try {
    await createPSQLCommand(sql_command);
    console.log(`Database "${database_name}" created successfully.`);
  } catch (error) {
    console.error(`Error creating database "${database_name}":`, error);
    Deno.exit(1);
  }
}

async function dropDatabase() {
  console.log("Dropping database...");

  const database_name = getDatabaseName();
  const sql_command = `DROP DATABASE IF EXISTS ${database_name} WITH (FORCE);`;

  try {
    await createPSQLCommand(sql_command);
    console.log(`Database "${database_name}" dropped successfully.`);
  } catch (error) {
    console.error(`Error dropping database "${database_name}":`, error);
    Deno.exit(1);
  }
}

async function main() {
  const command: string = Deno.args[0];

  if (command === "create") {
    await createDatabase();
  } else if (command === "drop") {
    await dropDatabase();
  } else {
    console.error("Unknown command. Use 'create' or 'drop'.");
    Deno.exit(1);
  }
}

await main();
