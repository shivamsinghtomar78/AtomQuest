export type UomType =
  | "min_numeric"
  | "min_percent"
  | "max_numeric"
  | "max_percent"
  | "timeline"
  | "zero";

type NumericLike = number | string | { toString(): string } | null | undefined;

export type ProgressScoreInput = {
  uomType: UomType;
  targetValue?: NumericLike;
  actualValue?: NumericLike;
  targetDate?: Date | string | null;
  actualDate?: Date | string | null;
  actualZero?: boolean | null;
};

const MAX_TRACKING_SCORE = 150;

function toNumber(value: NumericLike): number | null {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : null;
}

function toDateOnlyTime(value: Date | string | null | undefined): number | null {
  if (!value) return null;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function roundScore(score: number): number {
  return Math.round(score * 10_000) / 10_000;
}

export function computeProgressScore(input: ProgressScoreInput): number | null {
  const target = toNumber(input.targetValue);
  const actual = toNumber(input.actualValue);

  if (input.uomType === "min_numeric" || input.uomType === "min_percent") {
    if (target === null || actual === null || target <= 0) return null;
    return roundScore(Math.min((actual / target) * 100, MAX_TRACKING_SCORE));
  }

  if (input.uomType === "max_numeric" || input.uomType === "max_percent") {
    if (target === null || actual === null || target <= 0 || actual <= 0) {
      return null;
    }

    return roundScore(Math.min((target / actual) * 100, MAX_TRACKING_SCORE));
  }

  if (input.uomType === "timeline") {
    const targetTime = toDateOnlyTime(input.targetDate);
    const actualTime = toDateOnlyTime(input.actualDate);
    if (targetTime === null || actualTime === null) return null;
    if (actualTime <= targetTime) return 100;

    const lateDays = Math.floor((actualTime - targetTime) / 86_400_000);
    return Math.max(0, 100 - lateDays * 5);
  }

  if (input.uomType === "zero") {
    if (typeof input.actualZero === "boolean") {
      return input.actualZero ? 100 : 0;
    }

    if (actual === null) return null;
    return actual === 0 ? 100 : 0;
  }

  return null;
}
