export const COLORS = {
  // Primary brand
  primary: '#1A56A0',
  primaryDark: '#154080',
  primaryLight: '#E8F0FB',

  // Background & Base
  background: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',

  // Text
  text: '#1A1A2E',
  textMuted: '#64748B',
  textLight: '#94A3B8',

  // Rating / map pins
  success: '#22C55E',  // Recomendado
  warning: '#EAB308',  // Regular
  danger: '#EF4444',   // No recomendado

  // Rating border variants
  successBorder: '#DCFCE7',
  warningBorder: '#FEF9C3',
  dangerBorder: '#FEE2E2',

  // Accessibility chips
  accessibilityUser: '#16A34A',    // Confirmado por usuarios
  accessibilityGoogle: '#86EFAC',  // Confirmado por Google
  accessibilityNo: '#FCA5A5',      // No disponible

  // Alerts
  alertBg: '#FEF08A',
  alertBorder: '#EAB308',
} as const;

export function getPinColor(rating: number): string {
  if (rating >= 4.5) return COLORS.success;
  if (rating >= 3.5) return COLORS.warning;
  return COLORS.danger;
}

export function getPinBorderColor(rating: number): string {
  if (rating >= 4.5) return COLORS.successBorder;
  if (rating >= 3.5) return COLORS.warningBorder;
  return COLORS.dangerBorder;
}

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
