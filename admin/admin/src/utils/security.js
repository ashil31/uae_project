
import DOMPurify from 'dompurify';

// Configure once at app startup
DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
  // Prevent data-* attributes (common XSS vector)
  if (data.attrName.startsWith('data-')) {
    return node.removeAttribute(data.attrName);
  }
});

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;

  const stringInput = String(input);
  
  return DOMPurify.sanitize(stringInput, { 
    ALLOWED_TAGS: [], 
    ALLOWED_ATTR: [],
    FORBID_TAGS: ['style'],
    FORBID_ATTR: ['style', 'onerror', 'onload'],
    RETURN_DOM: false,         // Return string (not DOM)
    SANITIZE_DOM: true,        // Remove malicious nodes
    KEEP_CONTENT: false  
  });
};

export const validateAdminEmail = (email) => {
  const allowedDomains = ['uaefashion.ae', 'uaefashion.com','admin.uaefashion.ae'];
  if (!email) return false;
  
  // Strict email regex validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;

  const domain = email.split('@')[1];
  return allowedDomains.includes(domain);
};

export const generateSecureHeaders = (token) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest'
});
