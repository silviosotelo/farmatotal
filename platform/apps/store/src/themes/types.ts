export type ThemeKey = 'base' | 'ekomart' | 'anvogue' | 'grostore'

export type ThemeTokens = {
  // Colors (semantic, not Bacola-centric)
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  accent: string
  accentForeground: string
  background: string
  foreground: string
  surface: string
  surfaceForeground: string
  muted: string
  mutedForeground: string
  border: string
  destructive: string
  success: string
  warning: string
  // Typography
  fontFamily: string
  fontHeading: string
  // Layout
  borderRadius: string
  headerVariant: 'classic' | 'modern' | 'compact' | 'mega'
  footerVariant: 'standard' | 'dark' | 'minimal' | 'newsletter'
  containerMax: string
  // CSS framework
  cssFramework: 'tailwind' | 'bootstrap'
}

export type ThemeManifest = {
  key: ThemeKey
  name: string
  description: string
  thumbnail: string
  tokens: ThemeTokens
  defaultBlocks: Record<string, unknown[]>  // CMS page blocks per route
}

export type ThemeProductDetailProps = {
  product: any
  variants: any[]
  slug: string
  /** Legacy fields kept for backward compatibility with ekomart/anvogue themes */
  related?: any[]
  reviews?: any
}

export type ThemeCatalogProps = {
  products: any[]
  categories?: any[]
  total: number
  page: number
  pageSize?: number
  /** Legacy fields kept for backward compatibility with ekomart/anvogue themes */
  title?: string
  basePath?: string
  paginated?: boolean
}
