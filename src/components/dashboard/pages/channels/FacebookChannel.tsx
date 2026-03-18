import React from 'react';
import { Facebook } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const FacebookChannel = ({ workspaceId }: { workspaceId: string }) => (
  <ChannelPage 
    workspaceId={workspaceId}
    type="facebook"
    title="Facebook Messenger"
    icon={Facebook}
    description="Connect your Facebook Page to handle customer messages via Messenger."
  />
);
