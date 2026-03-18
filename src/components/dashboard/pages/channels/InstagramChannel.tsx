import React from 'react';
import { Instagram } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const InstagramChannel = ({ workspaceId }: { workspaceId: string }) => (
  <ChannelPage 
    workspaceId={workspaceId}
    type="instagram"
    title="Instagram Channel"
    icon={Instagram}
    description="Connect your Instagram Business account to handle direct messages."
  />
);
