import type { Request, Response } from "express";
import type { AddChannelMemberUseCase } from "@application/use-cases/channels/add-channel-member.usecase";
import type { CreateChannelUseCase } from "@application/use-cases/channels/create-channel.usecase";
import type { ListMyChannelsUseCase } from "@application/use-cases/channels/list-my-channels.usecase";

export class ChannelsController {
  constructor(
    private readonly listMyChannels: ListMyChannelsUseCase,
    private readonly createChannel: CreateChannelUseCase,
    private readonly addChannelMember: AddChannelMemberUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const conversations = await this.listMyChannels.execute(req.userId!);
    res.status(200).json({ channels: conversations });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const channel = await this.createChannel.execute(req.userId!, req.body);
    res.status(201).json({ channel });
  };

  addMember = async (req: Request, res: Response): Promise<void> => {
    const member = await this.addChannelMember.execute(req.userId!, req.params.channelId, req.body);
    res.status(201).json({ member });
  };
}
