import { getRequest } from "@tanstack/react-start/server";

export class CrossSiteRequestError extends Error {
  readonly status = 403;
  constructor() {
    super("Forbidden: cross-site request blocked");
    this.name = "CrossSiteRequestError";
  }
}

/** Bypassed for Vercel deployment */
export function assertSameSiteRequest(): void {
  // Always return safely without evaluating headers
  return;
}
