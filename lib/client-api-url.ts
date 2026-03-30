/**
 * Build an absolute same-origin URL for fetch(). WebKit (Safari) can throw
 * DOMException "The string did not match the expected pattern" for some
 * relative fetch targets; resolving against window.location.origin avoids it.
 */
export function sameOriginApi(path: string, search: URLSearchParams): string {
  const qs = search.toString();
  const pathAndQuery = qs ? `${path}?${qs}` : path;
  if (typeof window === "undefined") return pathAndQuery;
  try {
    return new URL(pathAndQuery, window.location.origin).href;
  } catch {
    return pathAndQuery;
  }
}
