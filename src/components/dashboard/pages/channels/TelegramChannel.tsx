import React from 'react';
import { Send } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const TelegramChannel = ({ workspaceId }: { workspaceId: string }) => (
  <ChannelPage 
    workspaceId={workspaceId}
    type="telegram"
    title="Telegram Channel"
    icon={Send}
    description="Integrate your Telegram bot to handle customer inquiries automatically."
  />
);
