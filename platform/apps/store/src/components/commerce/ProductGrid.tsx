import ProductCard from "./ProductCard"
import type { Product } from "@/types"

type Props = {
  products: Product[]
  columns?: 2 | 3 | 4 | 5
  variant?: "grid" | "list" | "compact"
}

export default function ProductGrid({ products, columns = 4, variant = "grid" }: Props) {
  const gridCols = { 2: "grid-cols-2", 3: "grid-cols-2 md:grid-cols-3", 4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4", 5: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" }
  if (variant === "list") {
    return <div className="space-y-3">{products.map((p) => <ProductCard key={p.id} product={p} variant="list" />)}</div>
  }
  return <div className={`grid ${gridCols[columns]} gap-4`}>{products.map((p) => <ProductCard key={p.id} product={p} variant={variant} />)}</div>
}
