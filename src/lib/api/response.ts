import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./errors";

export type ApiSuccess<T> = {
  success: true;
  data?: T;
  message?: string;
};

export type ApiFailure = {
  success: false;
  error: string;
  message?: string;
  data?: unknown;
};

export function ok<T>(data?: T, message?: string, status = 200) {
  return NextResponse.json<ApiSuccess<T>>(
    { success: true, data, message },
    { status }
  );
}

export function created<T>(data?: T, message = "Created") {
  return ok(data, message, 201);
}

export function fail(error: string, status = 500, data?: unknown, message?: string) {
  return NextResponse.json<ApiFailure>(
    { success: false, error, message, data },
    { status }
  );
}

export async function route(handler: () => Promise<NextResponse>) {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof ApiError) {
      return fail(error.code, error.status, error.details, error.message);
    }

    if (error instanceof ZodError) {
      return fail("Validation failed", 400, error.flatten());
    }

    console.error("API route error:", error);
    return fail("Internal server error", 500);
  }
}
