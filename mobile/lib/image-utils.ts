const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://pgvabchefwdnbwkpealg.supabase.co'
const ECG_BASE    = `${SUPABASE_URL}/storage/v1/object/public/ecg-images`
const MED_BASE    = `${SUPABASE_URL}/storage/v1/object/public/medical-images`

export function resolveImageUrl(imageUrl: string, moduleSlug: string): string {
  if (!imageUrl) return ''
  if (imageUrl.startsWith('http')) return imageUrl
  if (moduleSlug === 'ecg') return `${ECG_BASE}/${imageUrl}`
  return `${MED_BASE}/${imageUrl}`
}

export function resolveEcgFull(ecgId: number): string {
  return `${ECG_BASE}/ecg_${String(ecgId).padStart(5, '0')}.png`
}

export function resolveEcgD2Band(ecgId: number, diagCode?: string): string {
  const id = String(ecgId).padStart(5, '0')
  if (diagCode) return `${ECG_BASE}/ecg_${id}_${diagCode}_d2_band.png`
  return `${ECG_BASE}/ecg_${id}_d2_band.png`
}

export function resolveFocusUrl(
  focusUrls: Record<string, string> | null,
  key: string,
  moduleSlug: string
): string {
  if (!focusUrls?.[key]) return ''
  return resolveImageUrl(focusUrls[key], moduleSlug)
}
