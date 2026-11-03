// Pure helpers (no imports) that remove private data from monitoring events before they leave the phone.
// Same rules as server/sentry.js: no request bodies, cookies or query strings; only the user id; addresses without ? or #.

const SENSITIVE_HEADER = /^(?:authorization|cookie|set-cookie|proxy-authorization|x-api-key|x-auth-token)$/i;

export function stripQuery(value: unknown): string {
  const text = String(value);
  const cut = text.search(/[?#]/);
  return cut === -1 ? text : text.slice(0, cut);
}

export function scrubBreadcrumb(crumb: any): any {
  if (!crumb || typeof crumb !== 'object') return crumb;
  const data = crumb.data;
  if (data && typeof data === 'object') {
    for (const key of ['url', 'from', 'to']) if (typeof data[key] === 'string') data[key] = stripQuery(data[key]);
    for (const key of ['body', 'request_body', 'response_body', 'query', 'query_string']) delete data[key];
  }
  return crumb;
}

export function scrubEvent(event: any): any {
  if (!event || typeof event !== 'object') return event;
  const request = event.request;
  if (request && typeof request === 'object') {
    delete request.data;
    delete request.cookies;
    delete request.query_string;
    if (typeof request.url === 'string') request.url = stripQuery(request.url);
    if (request.headers && typeof request.headers === 'object') {
      for (const name of Object.keys(request.headers)) if (SENSITIVE_HEADER.test(name)) delete request.headers[name];
    }
  }
  if (event.user && typeof event.user === 'object') event.user = event.user.id ? { id: String(event.user.id) } : undefined;
  if (Array.isArray(event.breadcrumbs)) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb).filter(Boolean);
  return event;
}
