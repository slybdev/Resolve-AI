import React from 'react';
import { Mic } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const VoiceAIChannel = ({ workspaceId }: { workspaceId: string }) => (
  <ChannelPage 
    workspaceId={workspaceId}
    type="voice"
    title="Voice AI"
    icon={Mic}
    description="Configure your AI voice agent for phone calls and voice interactions."
  />
);
