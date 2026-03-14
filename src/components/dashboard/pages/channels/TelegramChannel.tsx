import React from 'react';
import { Send } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const TelegramChannel = () => (
  <ChannelPage 
    type="telegram"
    title="Telegram Channel"
    icon={Send}
    description="Integrate your Telegram bot to handle customer inquiries automatically."
  />
);
