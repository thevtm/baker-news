import { expect } from "jsr:@std/expect";

Deno.test("make sure NODE_ENV is set to test", () => {
  expect(Deno.env.get("NODE_ENV"), "NODE_ENV is not set to 'test'").toBe("test");
});
