const LUCIDE_TO_EMOJI: Record<string, string> = {
  'heart':         '🫀',
  'scan':          '🫁',
  'scan-face':     '🩺',
  'eye':           '👁️',
  'microscope':    '🔬',
  'flask-conical': '⚗️',
  'brain':         '🧠',
  'waves':         '〰️',
  'bone':          '🦴',
  'monitor':       '🖥️',
  'box':           '📦',
  'bug':           '🦠',
  'droplet':       '🩸',
  'test-tube':     '🧪',
  'shield-alert':  '😷',
  'accessibility': '🩻',
  'heart-pulse':   '💓',
  'activity':      '📈',
  'zap':           '⚡',
  'pill':          '💊',
}

export function resolveIcon(icon: string | null | undefined): string {
  if (!icon) return '📋'
  // Already an emoji (contains non-ASCII characters)
  if (/[^\x00-\x7F]/.test(icon)) return icon
  return LUCIDE_TO_EMOJI[icon] ?? '📋'
}
