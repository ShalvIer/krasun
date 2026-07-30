import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = "REQUEST_FAILED") { super(message); }
}

export function asyncRoute<T>(handler: (req: Request, res: Response) => Promise<T>) {
  return (req: Request, res: Response, next: NextFunction) => { void handler(req, res).catch(next); };
}

export function routeParam(req: Request, name: string) {
  const value = req.params[name];
  if (typeof value !== "string" || !value) throw new HttpError(400, `Missing route parameter: ${name}`);
  return value;
}

export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (error instanceof ZodError) return res.status(400).json({ error: "Validation failed", details: error.flatten() });
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message, code: error.code });
  console.error(error);
  return res.status(500).json({ error: "Internal server error", code: "INTERNAL_ERROR" });
}
