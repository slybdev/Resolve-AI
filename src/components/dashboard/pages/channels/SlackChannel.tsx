import React from 'react';
import { Slack } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const SlackChannel = ({ workspaceId }: { workspaceId: string }) => (
  <ChannelPage 
    workspaceId={workspaceId}
    type="slack"
    title="Slack Channel"
    icon={Slack}
    description="Connect your Slack workspace to manage support directly from your channels."
  />
);
