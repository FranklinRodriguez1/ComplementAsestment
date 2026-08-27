import type { Request, Response } from "express";
import type { AskCopilotUseCase } from "@application/use-cases/copilot/ask-copilot.usecase";

export class CopilotController {
  constructor(private readonly askCopilot: AskCopilotUseCase) {}

  ask = async (req: Request, res: Response): Promise<void> => {
    const result = await this.askCopilot.execute(req.userId!, req.body);
    res.status(200).json(result);
  };
}
