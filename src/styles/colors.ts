/**
 * Color palette for IrTranquilo
 * Clean, professional design with blue primary + traffic light indicators
 */

export const COLORS = {
  // Primary brand (Blue)
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',

  // Background & Base
  background: '#F8FAFC', // Clean, cold white
  backgroundAlt: '#FAF7F2', // Warm cream alternative
  card: '#FFFFFF',
  border: '#E5E7EB',

  // Text
  text: '#111827', // Soft black
  textMuted: '#6B7280',
  textLight: '#9CA3AF',

  // Semantic colors (Traffic light - ONLY for map pins/status)
  success: '#10B981', // Green - Recommended
  warning: '#F59E0B', // Yellow/Amber - Acceptable
  danger: '#EF4444', // Red - Not recommended

  // Status variants
  successBorder: '#D1FAE5',
  warningBorder: '#FEF3C7',
  dangerBorder: '#FEE2E2',
} as const;

/**
 * Get pin color based on rating
 * Semantic: 4.5+ green (recommended), 3.5-4.5 yellow (acceptable), <3.5 red (avoid)
 */
export function getPinColor(rating: number): string {
  if (rating >= 4.5) return COLORS.success; // 🟢
  if (rating >= 3.5) return COLORS.warning; // 🟡
  return COLORS.danger; // 🔴
}

/**
 * Get border color for rating (lighter variant)
 */
export function getPinBorderColor(rating: number): string {
  if (rating >= 4.5) return COLORS.successBorder;
  if (rating >= 3.5) return COLORS.warningBorder;
  return COLORS.dangerBorder;
}

/**
 * Tailwind-compatible CSS variables
 * Add to :root {} or use as reference
 */
export const getCssVariables = () => ({
  '--primary': COLORS.primary,
  '--primary-dark': COLORS.primaryDark,
  '--primary-light': COLORS.primaryLight,
  '--background': COLORS.background,
  '--card': COLORS.card,
  '--border': COLORS.border,
  '--text': COLORS.text,
  '--text-muted': COLORS.textMuted,
  '--text-light': COLORS.textLight,
  '--success': COLORS.success,
  '--warning': COLORS.warning,
  '--danger': COLORS.danger,
});
