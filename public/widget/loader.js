(function() {
  const script = document.currentScript || document.querySelector('script[data-xentraldesk-id]');
  if (!script) {
    console.error('XentralDesk Widget: No script tag found with data-xentraldesk-id.');
    return;
  }

  const workspaceId = script.dataset.xentraldeskId;
  const color = script.dataset.color || '#3b82f6';
  const title = script.dataset.title || 'Support';

  // Load the main widget JS
  const widgetScript = document.createElement('script');
  widgetScript.src = 'https://cdn.xentraldesk.io/widget/main.js'; // In production
  // For local testing, use relative or absolute path:
  // widgetScript.src = '/widget.js'; 
  widgetScript.async = true;
  widgetScript.dataset.id = workspaceId;
  widgetScript.dataset.color = color;
  widgetScript.dataset.title = title;
  
  document.head.appendChild(widgetScript);

  // Load CSS if needed (Vite usually bundles it into JS or a separate file)
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://cdn.xentraldesk.io/widget/style.css';
  document.head.appendChild(link);
})();
