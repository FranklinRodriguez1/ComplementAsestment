import type { Request, Response } from "express";
import type { LoginUserUseCase } from "@application/use-cases/auth/login-user.usecase";
import type { RefreshSessionUseCase } from "@application/use-cases/auth/refresh-session.usecase";
import type { RegisterUserUseCase } from "@application/use-cases/auth/register-user.usecase";
import { REFRESH_COOKIE_NAME, clearRefreshCookie, setRefreshCookie } from "../utils/refresh-cookie";

export class AuthController {
  constructor(
    private readonly registerUser: RegisterUserUseCase,
    private readonly loginUser: LoginUserUseCase,
    private readonly refreshSession: RefreshSessionUseCase,
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    const session = await this.registerUser.execute(req.body);
    setRefreshCookie(res, session.refreshToken);
    res.status(201).json({ user: session.user, accessToken: session.accessToken });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const session = await this.loginUser.execute(req.body);
    setRefreshCookie(res, session.refreshToken);
    res.status(200).json({ user: session.user, accessToken: session.accessToken });
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const session = await this.refreshSession.execute(req.cookies?.[REFRESH_COOKIE_NAME]);
    setRefreshCookie(res, session.refreshToken);
    res.status(200).json({ user: session.user, accessToken: session.accessToken });
  };

  logout = async (_req: Request, res: Response): Promise<void> => {
    clearRefreshCookie(res);
    res.status(204).send();
  };
}
