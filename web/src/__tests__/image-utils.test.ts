import {
  resolveImageUrl,
  resolveEcgFull,
  resolveEcgD2Band,
  resolveFocusUrl,
} from '@/lib/image-utils'

describe('resolveImageUrl', () => {
  it('returns full URL as-is when it starts with http', () => {
    const url = 'https://example.com/image.png'
    expect(resolveImageUrl(url, 'ecg')).toBe(url)
  })

  it('prefixes ecg-images bucket for ecg moduleSlug', () => {
    const result = resolveImageUrl('some/image.png', 'ecg')
    expect(result).toContain('ecg-images')
    expect(result).toContain('some/image.png')
  })

  it('prefixes medical-images bucket for dermato moduleSlug', () => {
    const result = resolveImageUrl('some/image.png', 'dermato')
    expect(result).toContain('medical-images')
    expect(result).toContain('some/image.png')
  })

  it('returns empty string for empty input', () => {
    expect(resolveImageUrl('', 'ecg')).toBe('')
  })
})

describe('resolveEcgFull', () => {
  it('returns URL containing ecg_00001.png for id 1', () => {
    const result = resolveEcgFull(1)
    expect(result).toContain('ecg_00001.png')
  })

  it('pads ecg id to 5 digits', () => {
    const result = resolveEcgFull(42)
    expect(result).toContain('ecg_00042.png')
  })
})

describe('resolveEcgD2Band', () => {
  it('returns URL containing ecg_00001 and d2_band for id 1', () => {
    const result = resolveEcgD2Band(1)
    expect(result).toContain('ecg_00001')
    expect(result).toContain('d2_band')
  })

  it('includes diagCode in URL when provided', () => {
    const result = resolveEcgD2Band(1, 'NORM')
    expect(result).toContain('NORM')
    expect(result).toContain('d2_band')
  })
})

describe('resolveFocusUrl', () => {
  it('returns empty string when focusUrls is null', () => {
    expect(resolveFocusUrl(null, 'd2', 'ecg')).toBe('')
  })

  it('returns empty string when key is not in focusUrls', () => {
    expect(resolveFocusUrl({ other: 'image.png' }, 'd2', 'ecg')).toBe('')
  })

  it('resolves the URL when key is found in focusUrls', () => {
    const result = resolveFocusUrl({ d2: 'focus.png' }, 'd2', 'ecg')
    expect(result).toContain('focus.png')
    expect(result).toContain('ecg-images')
  })
})
