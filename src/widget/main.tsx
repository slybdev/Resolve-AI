import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChatWidgetPublic } from '../components/widget/ChatWidgetPublic';
import '@/src/index.css';

// Constants for ID and layout
const IFRAME_ID = 'xentraldesk-widget-iframe';
const ROOT_ID = 'xentraldesk-widget-root';

const scriptTag = document.currentScript || document.querySelector('script[data-xentraldesk-id]');
const workspaceKey = scriptTag?.getAttribute('data-xentraldesk-id') || 
                    scriptTag?.getAttribute('data-xentraldesk-workspace-key') || 
                    (window as any).XentralDesk?.workspaceKey;

if (workspaceKey) {
  const scriptSrc = scriptTag?.getAttribute('src') || '';
  const baseUrl = scriptSrc.includes('://') 
    ? new URL(scriptSrc).origin 
    : window.location.origin;

  // 1. Create Iframe Container
  const iframe = document.createElement('iframe');
  iframe.id = IFRAME_ID;
  iframe.style.position = 'fixed';
  iframe.style.bottom = '0';
  iframe.style.right = '0';
  iframe.style.width = '100px';  // Small initially (launcher size)
  iframe.style.height = '100px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '999999';
  iframe.style.colorScheme = 'none';
  iframe.style.transition = 'width 0.2s, height 0.2s';
  iframe.setAttribute('allow', 'camera; microphone; clipboard-read; clipboard-write');
  
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    // 2. Inject Base HTML & CSS into Iframe
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <link rel="stylesheet" href="${baseUrl}/widget.css">
          <style>
            body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
            #${ROOT_ID} { position: absolute; bottom: 0; right: 0; width: 100%; height: 100%; }
          </style>
        </head>
        <body>
          <div id="${ROOT_ID}"></div>
        </body>
      </html>
    `);
    doc.close();

    // 3. Render React App into the Iframe's Root
    const rootContainer = doc.getElementById(ROOT_ID);
    if (rootContainer) {
      const primaryColor = scriptTag?.getAttribute('data-color') || (window as any).XentralDesk?.primaryColor;
      const title = scriptTag?.getAttribute('data-title') || (window as any).XentralDesk?.title;
      const theme = scriptTag?.getAttribute('data-theme') as 'light' | 'dark' || (window as any).XentralDesk?.theme || 'dark';

      // Provide a callback to resize iframe from within React
      (window as any).XentralDesk_Resize = (width: string, height: string) => {
        iframe.style.width = width;
        iframe.style.height = height;
      };

      ReactDOM.createRoot(rootContainer).render(
        <React.StrictMode>
          <ChatWidgetPublic 
            workspaceId={workspaceKey} 
            primaryColor={primaryColor}
            title={title}
            theme={theme}
            baseUrl={baseUrl}
            onResize={(w, h) => (window as any).XentralDesk_Resize(w, h)}
          />
        </React.StrictMode>
      );
    }
  }
} else {
  console.error('XentralDesk Widget: No workspace key provided.');
}
