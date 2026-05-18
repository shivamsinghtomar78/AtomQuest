import assert from "node:assert/strict";
import { computeProgressScore } from "./scoring";

assert.equal(
  computeProgressScore({
    uomType: "min_numeric",
    targetValue: 100,
    actualValue: 200,
  }),
  150,
  "min numeric overachievement should cap at 150"
);

assert.equal(
  computeProgressScore({
    uomType: "max_numeric",
    targetValue: 100,
    actualValue: 50,
  }),
  150,
  "max numeric overachievement should cap at 150"
);

assert.equal(
  computeProgressScore({
    uomType: "max_numeric",
    targetValue: 10,
    actualValue: 0,
  }),
  null,
  "max numeric with zero actual should return null"
);

assert.equal(
  computeProgressScore({
    uomType: "zero",
    actualValue: 0,
  }),
  100,
  "zero UoM should return 100 when actual is zero"
);

assert.equal(
  computeProgressScore({
    uomType: "zero",
    actualValue: 1,
  }),
  0,
  "zero UoM should return 0 when actual is non-zero"
);

assert.equal(
  computeProgressScore({
    uomType: "timeline",
    targetDate: "2026-03-10",
    actualDate: "2026-03-13",
  }),
  85,
  "timeline should lose 5 points per late day"
);

assert.equal(
  computeProgressScore({
    uomType: "timeline",
    targetDate: "2026-03-10",
    actualDate: "2026-03-10",
  }),
  100,
  "timeline should score 100 on the deadline"
);

assert.equal(
  computeProgressScore({
    uomType: "min_percent",
    targetValue: 0,
    actualValue: 80,
  }),
  null,
  "min percent with zero target should return null"
);

assert.equal(
  computeProgressScore({
    uomType: "max_percent",
    targetValue: 80,
    actualValue: 160,
  }),
  50,
  "max percent should reward lower actuals against target"
);

assert.equal(
  computeProgressScore({
    uomType: "timeline",
    targetDate: "2026-03-10",
    actualDate: "2026-04-10",
  }),
  0,
  "timeline should not return negative scores"
);

console.log("Scoring checks passed");
