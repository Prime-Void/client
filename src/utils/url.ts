export function combineURLs(baseURL: string, relativeURL: string): string {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
}

export function isAbsoluteURL(url: string): boolean {
  return /^([a-z][a-z\d+\-.]*:)?\/\//i.test(url);
}

export function buildURL(
  url: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  if (!params) return url;

  const serializedParams = Object.entries(params)
    .filter(([_, value]) => value != null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');

  if (!serializedParams) return url;

  const hashIndex = url.indexOf('#');
  const urlWithoutHash = hashIndex === -1 ? url : url.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : url.slice(hashIndex);

  const separator = urlWithoutHash.indexOf('?') === -1 ? '?' : '&';

  return urlWithoutHash + separator + serializedParams + hash;
}

export function parseURL(url: string): URL {
  try {
    return new URL(url);
  } catch {
    return new URL(url, window.location.origin);
  }
}
