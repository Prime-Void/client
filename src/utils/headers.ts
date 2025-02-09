export function normalizeHeaderName(name: string): string {
  return name.toLowerCase();
}

export function parseHeaders(headers: Headers): Record<string, string> {
  const parsed: Record<string, string> = {};
  headers.forEach((value, name) => {
    parsed[normalizeHeaderName(name)] = value;
  });
  return parsed;
}

export function mergeHeaders(
  target: Record<string, string>,
  source?: Record<string, string>
): Record<string, string> {
  if (!source) return target;

  Object.entries(source).forEach(([key, value]) => {
    target[normalizeHeaderName(key)] = value;
  });

  return target;
}

export function isFormData(value: unknown): value is FormData {
  return value instanceof FormData;
}

export function getContentType(headers: Record<string, string>): string | null {
  return headers['content-type'] || null;
}
