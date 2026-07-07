import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";

import { CurrentUser } from "../common/decorators/current-user.decorator";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { AuthenticatedUser } from "../common/auth/authenticated-user";
import { AuthCookieService } from "./auth-cookie.service";
import { AcceptInviteDto } from "./dto/accept-invite.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { SignInDto } from "./dto/sign-in.dto";
import { SignUpDto } from "./dto/sign-up.dto";
import { AuthService } from "./auth.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post("sign-up")
  async signUp(@Body() dto: SignUpDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.signUp(dto);
    return this.completeAuth(response, session);
  }

  @Get("invitations/:token")
  getInvitation(@Param("token") token: string) {
    return this.authService.getInvitation(token);
  }

  @Post("accept-invite")
  async acceptInvite(
    @Body() dto: AcceptInviteDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.authService.acceptInvite(dto);
    return this.completeAuth(response, session);
  }

  @Post("sign-in")
  async signIn(@Body() dto: SignInDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.signIn(dto);
    return this.completeAuth(response, session);
  }

  @Post("refresh")
  async refresh(
    @Req() request: Request,
    @Body() dto: Partial<RefreshTokenDto>,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      this.authCookieService.readRefreshToken(request.headers.cookie) ?? dto.refreshToken;
    const session = await this.authService.refresh(refreshToken);
    return this.completeAuth(response, session);
  }

  @Post("logout")
  async logout(
    @Req() request: Request,
    @Body() dto: Partial<RefreshTokenDto>,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      this.authCookieService.readRefreshToken(request.headers.cookie) ?? dto.refreshToken;
    const result = await this.authService.logout(refreshToken);
    this.authCookieService.clearAuthCookies(response);
    return result;
  }

  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Get("me")
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  private completeAuth(response: Response, session: Awaited<ReturnType<AuthService["signIn"]>>) {
    this.authCookieService.setAuthCookies(response, session);
    const { accessToken: _accessToken, refreshToken: _refreshToken, ...body } = session;
    return body;
  }
}
