import type { Request, Response } from "express";
import type { GetProfileUseCase } from "@application/use-cases/users/get-profile.usecase";
import type { UpdateProfileUseCase } from "@application/use-cases/users/update-profile.usecase";

export class UsersController {
  constructor(
    private readonly getProfile: GetProfileUseCase,
    private readonly updateProfile: UpdateProfileUseCase,
  ) {}

  me = async (req: Request, res: Response): Promise<void> => {
    // req.userId is set by auth.middleware.ts from the verified JWT --
    // never from req.params, so this can only ever return the caller's
    // own profile.
    const profile = await this.getProfile.execute(req.userId!);
    res.status(200).json({ user: profile });
  };

  updateMe = async (req: Request, res: Response): Promise<void> => {
    const profile = await this.updateProfile.execute(req.userId!, req.body);
    res.status(200).json({ user: profile });
  };
}
