import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * WHY: Request ID middleware assigns a unique ID to every incoming request.
 * This enables log correlation — when debugging a production issue, you can
 * filter all log lines for a single request ID to see the full request lifecycle.
 *
 * If the request already has an X-Request-Id header (from a load balancer or
 * reverse proxy), we reuse it. Otherwise we generate a UUID v4.
 * The ID is set on req.id and echoed back in the response header.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestId =
    (req.headers['x-request-id'] as string) || randomUUID();

  // WHY: Attach to req so downstream code (guards, services, exception filter)
  // can access it without importing a separate context module.
  req.id = requestId;

  // WHY: Echo back in response so clients/load balancers can correlate.
  res.setHeader('X-Request-Id', requestId);

  next();
}
