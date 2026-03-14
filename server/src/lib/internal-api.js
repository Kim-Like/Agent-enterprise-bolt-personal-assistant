export const INTERNAL_API_HEADER = "x-control-plane-token";

export function hasInternalAccess(request, internalApiToken) {
  if (!internalApiToken) {
    return false;
  }

  return request.headers[INTERNAL_API_HEADER] === internalApiToken;
}

export function internalApiHeaders(internalApiToken) {
  return {
    [INTERNAL_API_HEADER]: internalApiToken,
  };
}

export function denyInternalAccess(reply, message) {
  return reply.code(403).send({
    error:
      message ||
      "This route is only available through the Lavpris public ingress.",
  });
}
