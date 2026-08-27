import { ChannelPage } from "@/components/conversation/channel-page";

export default async function Page({
  params,
}: {
  params: Promise<{ channelId: string }>;
}) {
  const { channelId } = await params;
  return <ChannelPage channelId={channelId} />;
}
