const STATUS_MESSAGES = {
  400: "Invalid request.",
  401: "Authentication required.",
  403: "You are not allowed to perform this request.",
  404: "The requested resource was not found.",
  409: "This request conflicts with the current state.",
  413: "The request is too large.",
  415: "Unsupported request content type.",
  429: "Too many requests. Please try again later.",
  503: "Service temporarily unavailable.",
};

function getSafeStatus(err) {
  if (err && err.type === "entity.too.large") return 413;
  if (err && err.type === "entity.parse.failed") return 400;
  if (err && err.code === "LIMIT_FILE_SIZE") return 413;
  if (err && (err.message === "Origin not allowed by CORS" || err.code === "CORS_ORIGIN_DENIED")) return 403;
  const status = Number(err && (err.status || err.statusCode));
  return Number.isInteger(status) && status >= 400 && status <= 499 ? status : 500;
}

function getSafeMessage(err, status) {
  if (status === 500) return "An unexpected server error occurred.";
  if (err && err.code === "LIMIT_FILE_SIZE") return "Uploaded file exceeds the 12 MB limit.";
  if (err && err.message === "Origin not allowed by CORS") return "This origin is not allowed.";
  return STATUS_MESSAGES[status] || (typeof (err && err.message) === "string" ? err.message : "Request failed.");
}

function errorPayload(err, requestId) {
  const status = getSafeStatus(err);
  return {
    status,
    body: {
      error: getSafeMessage(err, status),
      code: status === 500 ? "INTERNAL_ERROR" : (err && err.code ? String(err.code) : `HTTP_${status}`),
      requestId: requestId || null,
    },
  };
}

module.exports = { getSafeStatus, getSafeMessage, errorPayload };
