/**
 * Dynamically loads a Google Font by adding a link element to the document head
 */
export const loadGoogleFont = (fontName: string) => {
  if (typeof window === 'undefined' || !fontName) return;
  
  // Standardize name for URL
  const formattedName = fontName.replace(/\s+/g, '+');
  const elementId = `google-font-${formattedName.toLowerCase()}`;
  
  if (document.getElementById(elementId)) return;
  
  const link = document.createElement('link');
  link.id = elementId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:wght@400;500;600;700;900&display=swap`;
  document.head.appendChild(link);
};
