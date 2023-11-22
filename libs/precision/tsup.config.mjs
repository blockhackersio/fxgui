import { defineConfig } from "tsup";
import { modernConfig } from "config/tsup.mjs";

export default defineConfig([modernConfig({ entry: ["src/index.ts"] })]);
