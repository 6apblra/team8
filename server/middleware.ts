import type { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 300 : 1000,
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." },
  skip: (req) => {
    // Don't rate limit WebSocket upgrade requests or health checks
    return req.path === "/health" || req.headers.upgrade === "websocket";
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login/register requests per hour
  message: {
    error: "Too many login/register attempts, please try again later.",
  },
});

export function validateRequest(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse request body, query, and params if needed
      // For now, we mostly validate the body
      if (req.method === "GET") {
        req.query = await schema.parseAsync(req.query);
      } else {
        req.body = await schema.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: error.errors.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}
