import type { ThemeKey, ThemeTokens } from './types'
import { THEMES_MANIFEST, getThemeManifest } from './manifests'

export type { ThemeKey, ThemeTokens }
export { THEMES_MANIFEST, getThemeManifest }

export const THEMES = [
  { key: 'base' as ThemeKey, label: 'Farmatotal', desc: 'Pharmacy — default' },
  { key: 'ekomart' as ThemeKey, label: 'Ekomart', desc: 'Grocery — dense' },
  { key: 'anvogue' as ThemeKey, label: 'Anvogue', desc: 'Fashion — minimal' },
  { key: 'grostore' as ThemeKey, label: 'Grostore', desc: 'Grocery — clean' },
]

export function normalizeTheme(raw?: string | null): ThemeKey {
  const v = (raw ?? 'base').trim().toLowerCase()
  return (THEMES.find((t) => t.key === v)?.key ?? 'base') as ThemeKey
}

export async function getActiveTheme(): Promise<ThemeKey> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? ''}/cms/settings/store_config`, {
      cache: 'no-store',
    })
    if (!res.ok) return 'base'
    const json = await res.json()
    return normalizeTheme(json?.value?.theme)
  } catch {
    return 'base'
  }
}

export function themeAccentVars(themeOrTokens: ThemeKey | ThemeTokens): Record<string, string> {
  const tokens: ThemeTokens =
    typeof themeOrTokens === 'string'
      ? getThemeManifest(themeOrTokens).tokens
      : themeOrTokens
  return {
    '--primary': tokens.primary,
    '--primary-foreground': tokens.primaryForeground,
    '--secondary': tokens.secondary,
    '--secondary-foreground': tokens.secondaryForeground,
    '--accent': tokens.accent,
    '--accent-foreground': tokens.accentForeground,
    '--background': tokens.background,
    '--foreground': tokens.foreground,
    '--surface': tokens.surface,
    '--surface-foreground': tokens.surfaceForeground,
    '--muted': tokens.muted,
    '--muted-foreground': tokens.mutedForeground,
    '--border-color': tokens.border,
    '--destructive': tokens.destructive,
    '--success': tokens.success,
    '--warning': tokens.warning,
    '--radius': tokens.borderRadius,
    '--font-family': tokens.fontFamily,
    '--font-heading': tokens.fontHeading,
    '--container-max': tokens.containerMax,
  }
}
