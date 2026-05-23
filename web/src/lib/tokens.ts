export const colors = {
  primary:        '#0F766E',
  primaryDark:    '#134e4a',
  primaryLight:   '#0891b2',
  primary50:      '#f0fdf4',

  bg:             '#f4f7f8',
  card:           '#ffffff',

  text:           '#09090b',
  textSecondary:  '#71717a',
  textMuted:      '#94a3b8',

  border:         '#e4e4e7',

  success:        '#22c55e',
  successBg:      '#f0fdf4',
  successText:    '#166534',

  error:          '#ef4444',
  errorBg:        '#fef2f2',
  errorText:      '#991b1b',

  warning:        '#f97316',
  warningBg:      '#fffbeb',
  warningText:    '#92400e',
} as const

export const gradients = {
  primary: 'linear-gradient(135deg, #0F766E, #0891b2)',
  header:  'linear-gradient(160deg, #0F766E 0%, #134e4a 100%)',
  success: 'linear-gradient(135deg, #10b981, #22d3ee)',
  danger:  'linear-gradient(135deg, #ef4444, #f97316)',
} as const

export const radii = {
  sm:  '10px',
  md:  '14px',
  lg:  '18px',
  xl:  '22px',
  xxl: '28px',
} as const
