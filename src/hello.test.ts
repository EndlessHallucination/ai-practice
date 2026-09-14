import { expect, test } from "vitest";
import { hello } from "./hello.js";

test("greets by name", () => {
  expect(hello("basil")).toBe("hi basil");
});