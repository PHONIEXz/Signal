import test from "node:test";
import assert from "node:assert/strict";
import { growthRange } from "./growth-chart.ts";

test("small changes on large accounts remain readable, with optional zero baseline", () => {
  assert.deepEqual(growthRange([10000, 10001, 10003]), [9999, 10004]);
  assert.deepEqual(growthRange([10000, 10001, 10003], true), [0, 10004]);
});
test("flat, single, empty and zero histories have nondegenerate nonnegative axes", () => {
  for (const values of [[], [0], [0, 0], [42], [42, 42], [NaN, Infinity]]) {
    const [min, max] = growthRange(values);
    assert.ok(min >= 0 && max > min);
  }
});
test("range contains every observation including declines and outliers", () => {
  const values = [300, 200, 0, 15000];
  const [min, max] = growthRange(values);
  assert.ok(values.every(value => value >= min && value <= max));
});
