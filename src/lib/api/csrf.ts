/** Custom header for same-origin mutating API calls (simple CSRF guard). */
export const CSRF_HEADER_NAME = "x-requested-with";
export const CSRF_HEADER_VALUE = "lottery";

export function hasValidCsrf(request: Request): boolean {
  return request.headers.get(CSRF_HEADER_NAME) === CSRF_HEADER_VALUE;
}

export function csrfHeaders(extra?: Record<string, string>): Record<string, string> {
  return {
    [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE,
    ...extra,
  };
}
