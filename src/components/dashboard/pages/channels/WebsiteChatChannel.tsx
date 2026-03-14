import React from 'react';
import { Globe } from 'lucide-react';
import { ChannelPage } from './ChannelPage';

export const WebsiteChatChannel = () => (
  <ChannelPage 
    type="website"
    title="Website Chat"
    icon={Globe}
    description="Manage your live chat widget and website integration settings."
  />
);
