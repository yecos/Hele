/**
 * Centralized admin configuration
 * Single source of truth for admin users and emails
 *
 * Admin emails can be configured via ADMIN_EMAILS env var (comma-separated)
 * Falls back to yecos11@gmail.com for backward compatibility
 */

// Admin usernames
export const ADMIN_USERS = ['admin'];

// Admin Google emails - configurable via env var, comma-separated
// Example: ADMIN_EMAILS=yecos11@gmail.com,other@gmail.com
export const ADMIN_EMAILS: string[] = (() => {
  const envEmails = process.env.ADMIN_EMAILS;
  if (envEmails) {
    return envEmails.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  }
  // Fallback for backward compatibility
  return ['yecos11@gmail.com'];
})();

/**
 * Check if a username has admin privileges
 */
export function isAdminUsername(username: string): boolean {
  return ADMIN_USERS.includes(username.toLowerCase());
}

/**
 * Check if an email has admin privileges
 */
export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

/**
 * Get role for a Google user based on email
 */
export function getGoogleUserRole(email: string): { username: string; role: string } {
  const emailPrefix = email.split('@')[0].toLowerCase();
  if (isAdminEmail(email)) {
    return { username: 'admin', role: 'admin' };
  }
  return { username: emailPrefix, role: 'user' };
}
