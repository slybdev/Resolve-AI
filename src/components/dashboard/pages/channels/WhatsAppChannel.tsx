import React from 'react';
import { MessageSquare } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const WhatsAppChannel = ({ workspaceId }: { workspaceId: string }) => (
  <ChannelPage 
    workspaceId={workspaceId}
    type="whatsapp"
    title="WhatsApp Channel"
    icon={MessageSquare}
    description="Connect your WhatsApp Business account for automated customer support."
  />
);
