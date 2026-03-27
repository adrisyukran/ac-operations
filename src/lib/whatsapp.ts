/**
 * WhatsApp Deep Link Utility
 * Generates wa.me URLs with pre-filled messages for customer communication
 */

/**
 * Generates a WhatsApp deep link (wa.me URL) with a pre-filled message
 * 
 * @param phone - Customer or contact phone number (will be cleaned to digits only)
 * @param message - Pre-filled message text (will be URL-encoded)
 * @returns Complete wa.me URL with message parameter
 * 
 * @example
 * generateWhatsAppLink('+60 12-345 6789', 'Hello from AC Operations')
 * // Returns: 'https://wa.me/60123456789?text=Hello%20from%20AC%20Operations'
 */
export function generateWhatsAppLink(phone: string, message: string): string {
  // Clean phone number: remove all non-digit characters except leading +
  const cleanedPhone = phone.startsWith('+')
    ? '+' + phone.slice(1).replace(/\D/g, '')
    : phone.replace(/\D/g, '');

  // URL-encode the message
  const encodedMessage = encodeURIComponent(message);

  // Build and return the wa.me URL
  return `https://wa.me/${cleanedPhone}?text=${encodedMessage}`;
}
