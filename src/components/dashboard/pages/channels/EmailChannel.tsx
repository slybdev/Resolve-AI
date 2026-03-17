import React from 'react';
import { Mail } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const EmailChannel = ({ workspaceId }: { workspaceId: string }) => (
  <ChannelPage 
    workspaceId={workspaceId}
    type="email"
    title="Email Channel"
    icon={Mail}
    description="Connect your support email and manage automated responses."
  />
);
