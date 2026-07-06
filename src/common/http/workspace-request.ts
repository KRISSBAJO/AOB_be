import { Request } from "express";

import { AuthenticatedUser } from "../auth/authenticated-user";

export type WorkspaceRequest = Request & {
  user: AuthenticatedUser;
  workspaceId: string;
};
