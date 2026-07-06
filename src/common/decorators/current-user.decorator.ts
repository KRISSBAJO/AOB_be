import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

import { AuthenticatedUser } from "../auth/authenticated-user";

type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);

