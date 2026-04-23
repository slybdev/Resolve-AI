/**
 * ResolveAI Widget Loader
 * This script bootstraps the chat widget.
 */
(function () {
  const script = document.currentScript || document.querySelector('script[data-xentraldesk-key]') || document.querySelector('script[data-xentraldesk-id]');
  if (!script) {
    console.error('ResolveAI: No script tag found with data-xentraldesk-key or data-xentraldesk-id.');
    return;
  }

  const workspaceKey = script.dataset.xentraldeskKey || script.getAttribute('data-xentraldesk-key');
  const workspaceId = script.dataset.xentraldeskId || script.getAttribute('data-xentraldesk-id');
  const color = script.dataset.color || script.getAttribute('data-color') || '#3b82f6';
  const title = script.dataset.title || script.getAttribute('data-title') || 'Support';
  const theme = script.dataset.theme || script.getAttribute('data-theme') || 'dark';

  // Set as globals for easier access by the main component
  window.XENTRALDESK_WORKSPACE_KEY = workspaceKey || workspaceId; // Fallback to ID for legacy
  window.XENTRALDESK_WORKSPACE_ID = workspaceId; // Keep for legacy if needed
  window.XENTRALDESK_COLOR = color;
  window.XENTRALDESK_TITLE = title;
  window.XENTRALDESK_THEME = theme;

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  // Use relative path for local dev to avoid CORS/Port issues if possible
  const baseUrl = (script.src.split('/widget.js')[0] || '');

  console.log('ResolveAI: Bootstrapping widget...', { workspaceId, isLocal, baseUrl });

  if (isLocal || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    const viteScript = document.createElement('script');
    viteScript.type = 'module';
    viteScript.src = `${baseUrl}/src/widget/main.tsx`;
    document.head.appendChild(viteScript);
  } else {
    // Production path
    const mainScript = document.createElement('script');
    mainScript.src = `${baseUrl}/widget.js`;
    mainScript.async = true;
    document.head.appendChild(mainScript);

    const styleLink = document.createElement('link');
    styleLink.rel = 'stylesheet';
    styleLink.href = `${baseUrl}/widget.css`;
    document.head.appendChild(styleLink);
  }
})();
