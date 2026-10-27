import assert from "node:assert/strict";
import { test } from "node:test";
import { pathMatchesGlob, slugify } from "./paths.js";

test("glob ** matches nested", () => {
  assert.equal(pathMatchesGlob("src/components/Button.tsx", "src/components/**"), true);
  assert.equal(pathMatchesGlob("src/utils/a.ts", "src/components/**"), false);
});

test("slugify kebab and cjk fallback", () => {
  assert.equal(slugify("Live Schedule"), "live-schedule");
  assert.match(slugify("直播排期"), /^lane-[a-z0-9]+$/);
});
