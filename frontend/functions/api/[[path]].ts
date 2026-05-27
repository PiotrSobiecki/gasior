// Proxy API na ten sam origin (gasior.online/api/* → Worker).
// Omija CORS i blokady cross-origin (np. Bot Fight) między apex a api.*.

const API_ORIGIN = "https://api.gasior.online";

export const onRequest: PagesFunction = async (context) => {
  const { request, params } = context;
  const segments = params.path;
  const pathSuffix = Array.isArray(segments)
    ? segments.join("/")
    : segments
      ? String(segments)
      : "";

  const incoming = new URL(request.url);
  const target = new URL(
    pathSuffix ? `/api/${pathSuffix}` : "/api",
    API_ORIGIN,
  );
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete("host");

  // duplex: "half" — wymagane przy przekazywaniu body (multipart ze zdjęciem).
  const hasBody =
    request.method !== "GET" &&
    request.method !== "HEAD" &&
    request.body !== null;
  const proxyRequest = new Request(target.toString(), {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
    ...(hasBody ? { duplex: "half" as const } : {}),
  });

  const response = await fetch(proxyRequest);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
};
