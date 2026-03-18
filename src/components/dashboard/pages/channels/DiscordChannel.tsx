import React from 'react';
import { MessageSquareDashed } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const DiscordChannel = ({ workspaceId }: { workspaceId: string }) => (
  <ChannelPage 
    workspaceId={workspaceId}
    type="discord"
    title="Discord Channel"
    icon={MessageSquareDashed}
    description="Connect your Discord bot to support users."
  />
);
