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
  70,
  "timeline should lose 10 points per late day"
);

console.log("Scoring checks passed");
