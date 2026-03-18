import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatWidgetPublic } from '../components/widget/ChatWidgetPublic';
import '@/src/index.css';

// The widget expects data-attributes on the script tag or a global config
const scriptTag = document.currentScript || document.querySelector('script[data-xentraldesk-id]');
const workspaceId = scriptTag?.getAttribute('data-xentraldesk-id') || 
                  scriptTag?.getAttribute('data-xentraldesk-workspace-id') || 
                  (window as any).XENTRALDESK_WORKSPACE_ID;
const primaryColor = scriptTag?.getAttribute('data-color') || (window as any).XENTRALDESK_COLOR;
const title = scriptTag?.getAttribute('data-title') || (window as any).XENTRALDESK_TITLE;
const theme = scriptTag?.getAttribute('data-theme') as 'light' | 'dark' || (window as any).XENTRALDESK_THEME || 'dark';

if (workspaceId) {
  const container = document.createElement('div');
  container.id = 'xentraldesk-widget-root';
  document.body.appendChild(container);

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      <ChatWidgetPublic 
        workspaceId={workspaceId} 
        primaryColor={primaryColor}
        title={title}
        theme={theme}
      />
    </React.StrictMode>
  );
} else {
  console.error('XentralDesk Widget: No workspace ID provided.');
}
