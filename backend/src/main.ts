import { exit } from "node:process";
import { db, schema } from "./db/index.ts";

async function main() {
  const user: typeof schema.users.$inferInsert = { name: "John Doe", role: "user" };

  await db.insert(schema.users).values(user);
  console.log("User inserted:", user);

  const users = await db.select().from(schema.users);
  console.log("Users:", users);

  console.log("Done!");
}

main()
  .then(() => {
    console.log("Main function executed successfully");
    exit(0);
  })
  .catch((error) => {
    console.error("Error executing main function:", error);
    exit(-1);
  });
