import Link from "next/link"
import { Mail, Phone, MapPin } from "lucide-react"

type FooterProps = {
  config: {
    brandName: string
    columns?: Array<{ title: string; links: Array<{ label: string; href: string }> }>
    social?: Array<{ platform: string; url: string }>
    copyright?: string
    newsletter?: boolean
  }
  tokens: { footerVariant: string }
}

export default function StoreFooter({ config, tokens }: FooterProps) {
  const isDark = tokens.footerVariant === "dark" || tokens.footerVariant === "newsletter"
  const cols = config.columns ?? []

  return (
    <footer className={isDark ? "bg-gray-900 text-gray-300" : "bg-surface border-t border-border"}>
      {config.newsletter && (
        <div className={`border-b ${isDark ? "border-gray-800" : "border-border"}`}>
          <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-4 px-4 py-8" style={{ maxWidth: "var(--container-max)" }}>
            <div>
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-foreground"}`}>Suscribite a nuestro newsletter</h3>
              <p className="text-sm text-muted-foreground">Recibí ofertas y novedades en tu email</p>
            </div>
            <form className="flex w-full md:w-auto" onSubmit={(e) => e.preventDefault()}>
              <input type="email" placeholder="Tu email" className={`flex-1 md:w-72 px-4 py-2.5 rounded-l-lg border ${isDark ? "border-gray-700 bg-gray-800 text-white" : "border-border bg-background"} text-sm focus:outline-none focus:ring-2 focus:ring-primary/30`} />
              <button className="px-6 py-2.5 text-white font-medium rounded-r-lg" style={{ background: "var(--primary)" }}>Suscribir</button>
            </form>
          </div>
        </div>
      )}
      <div className="mx-auto px-4 py-10" style={{ maxWidth: "var(--container-max)" }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? "text-white" : "text-foreground"}`}>{config.brandName}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">Tu tienda online de confianza para productos frescos y de calidad.</p>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isDark ? "text-white" : "text-foreground"}`}>{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((link) => <li key={link.href}><Link href={link.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{link.label}</Link></li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className={`border-t ${isDark ? "border-gray-800" : "border-border"}`}>
        <div className="mx-auto flex flex-col md:flex-row items-center justify-between gap-2 px-4 py-4 text-xs text-muted-foreground" style={{ maxWidth: "var(--container-max)" }}>
          <p>{config.copyright ?? `© ${new Date().getFullYear()} ${config.brandName}. Todos los derechos reservados.`}</p>
          <div className="flex items-center gap-3">
            <span>Medios de pago:</span>
            <div className="flex gap-2 opacity-60">
              <span className="px-2 py-0.5 border border-current rounded text-[10px]">VISA</span>
              <span className="px-2 py-0.5 border border-current rounded text-[10px]">MC</span>
              <span className="px-2 py-0.5 border border-current rounded text-[10px]">Bancard</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
