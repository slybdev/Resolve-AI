import React from 'react';
import { Globe } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const WebsiteChatChannel = ({ workspaceId }: { workspaceId: string }) => (
  <ChannelPage 
    workspaceId={workspaceId}
    type="website"
    title="Website Chat"
    icon={Globe}
    description="Manage your live chat widget and website integration settings."
  />
);
