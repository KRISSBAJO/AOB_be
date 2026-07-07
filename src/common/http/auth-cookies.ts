export const DEFAULT_ACCESS_COOKIE_NAME = "aog_access_token";
export const DEFAULT_REFRESH_COOKIE_NAME = "aog_refresh_token";

export function parseCookieHeader(header?: string): Record<string, string> {
  if (!header) return {};

  return header.split(";").reduce<Record<string, string>>((cookies, pair) => {
    const index = pair.indexOf("=");
    if (index === -1) return cookies;

    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();

    if (!key) return cookies;

    cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

export function readCookie(header: string | undefined, name: string) {
  return parseCookieHeader(header)[name];
}
