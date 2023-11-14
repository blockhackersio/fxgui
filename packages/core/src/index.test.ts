import { sum } from "./index.js";
import { test, expect } from "vitest";
test("It works", () => {
  expect(sum(12, 4)).toBe(16);
});
