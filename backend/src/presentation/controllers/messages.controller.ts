import type { Request, Response } from "express";
import type { DeleteMessageUseCase } from "@application/use-cases/messages/delete-message.usecase";
import type { EditMessageUseCase } from "@application/use-cases/messages/edit-message.usecase";
import type { ListChannelMessagesUseCase } from "@application/use-cases/messages/list-channel-messages.usecase";
import type { SearchMessagesUseCase } from "@application/use-cases/messages/search-messages.usecase";
import type { SendMessageUseCase } from "@application/use-cases/messages/send-message.usecase";
import type { MessageEmbedder } from "@application/services/message-embedder";
import type { RealtimePublisher } from "@domain/services/realtime-publisher";

export class MessagesController {
  constructor(
    private readonly listChannelMessages: ListChannelMessagesUseCase,
    private readonly sendMessage: SendMessageUseCase,
    private readonly editMessage: EditMessageUseCase,
    private readonly deleteMessage: DeleteMessageUseCase,
    private readonly searchMessages: SearchMessagesUseCase,
    private readonly realtimePublisher: RealtimePublisher,
    private readonly messageEmbedder: MessageEmbedder,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const page = await this.listChannelMessages.execute(req.userId!, req.params.channelId, req.query);
    res.status(200).json(page);
  };

  send = async (req: Request, res: Response): Promise<void> => {
    const message = await this.sendMessage.execute(req.userId!, req.params.channelId, req.body);
    // Broadcast AFTER the write commits successfully: every connected
    // member of the channel's socket room gets it, including the sender's
    // other tabs/devices, so the REST response and the socket event never
    // race each other into disagreeing about whether the send succeeded.
    this.realtimePublisher.publishNewMessage(message);
    // Fire-and-forget: semantic-search embedding is generated after the
    // response, never blocking it (see MessageEmbedder).
    this.messageEmbedder.embedInBackground(req.userId!, message.id, message.content);
    res.status(201).json({ message });
  };

  edit = async (req: Request, res: Response): Promise<void> => {
    const message = await this.editMessage.execute(req.userId!, req.params.messageId, req.body);
    // The search-vector trigger cleared the old embedding (content
    // changed); re-embed the new content in the background.
    this.messageEmbedder.embedInBackground(req.userId!, message.id, message.content);
    res.status(200).json({ message });
  };

  remove = async (req: Request, res: Response): Promise<void> => {
    await this.deleteMessage.execute(req.userId!, req.params.messageId);
    res.status(204).send();
  };

  search = async (req: Request, res: Response): Promise<void> => {
    const hits = await this.searchMessages.execute(req.userId!, req.query);
    res.status(200).json({ results: hits });
  };
}
