import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Response } from "express";

import {
  DEFAULT_ACCESS_COOKIE_NAME,
  DEFAULT_REFRESH_COOKIE_NAME,
  readCookie,
} from "../common/http/auth-cookies";

type SameSite = "lax" | "strict" | "none";

export type AuthCookieSession = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt?: Date | string;
  refreshTokenExpiresAt?: Date | string;
};

@Injectable()
export class AuthCookieService {
  constructor(private readonly configService: ConfigService) {}

  setAuthCookies(response: Response, session: AuthCookieSession) {
    response.cookie(this.accessCookieName, session.accessToken, {
      ...this.cookieOptions(),
      maxAge: this.maxAgeFrom(session.accessTokenExpiresAt, this.accessTtlSeconds * 1000),
    });
    response.cookie(this.refreshCookieName, session.refreshToken, {
      ...this.cookieOptions(),
      maxAge: this.maxAgeFrom(session.refreshTokenExpiresAt, this.refreshTtlDays * 24 * 60 * 60 * 1000),
    });
  }

  clearAuthCookies(response: Response) {
    const options = this.cookieOptions();
    response.clearCookie(this.accessCookieName, options);
    response.clearCookie(this.refreshCookieName, options);
  }

  readAccessToken(cookieHeader?: string) {
    return readCookie(cookieHeader, this.accessCookieName);
  }

  readRefreshToken(cookieHeader?: string) {
    return readCookie(cookieHeader, this.refreshCookieName);
  }

  private cookieOptions() {
    return {
      httpOnly: true,
      secure: this.secure,
      sameSite: this.sameSite,
      path: "/",
      domain: this.domain,
    };
  }

  private maxAgeFrom(expiresAt: Date | string | undefined, fallbackMs: number) {
    if (!expiresAt) return fallbackMs;

    const value = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, value);
  }

  private get accessCookieName() {
    return this.configService.get<string>("AUTH_ACCESS_COOKIE_NAME") ?? DEFAULT_ACCESS_COOKIE_NAME;
  }

  private get refreshCookieName() {
    return this.configService.get<string>("AUTH_REFRESH_COOKIE_NAME") ?? DEFAULT_REFRESH_COOKIE_NAME;
  }

  private get accessTtlSeconds() {
    return this.configService.get<number>("JWT_ACCESS_TTL_SECONDS", 3600);
  }

  private get refreshTtlDays() {
    return this.configService.get<number>("JWT_REFRESH_TTL_DAYS", 45);
  }

  private get secure() {
    const configured = this.configService.get<string>("AUTH_COOKIE_SECURE");
    if (configured !== undefined) return configured === "true";

    return process.env.NODE_ENV === "production";
  }

  private get sameSite(): SameSite {
    const configured = this.configService.get<string>("AUTH_COOKIE_SAME_SITE")?.toLowerCase();
    if (configured === "strict" || configured === "lax" || configured === "none") {
      return configured;
    }

    return this.secure ? "none" : "lax";
  }

  private get domain() {
    return this.configService.get<string>("AUTH_COOKIE_DOMAIN") || undefined;
  }
}
