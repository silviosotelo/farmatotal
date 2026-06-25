import { getPage } from "@/lib/api"
import ChaiRender, { type ChaiBlock } from "@/components/cms/ChaiRender"

type Args = { params: Promise<{ slug: string }> }

export default async function CategoryPage({ params }: Args) {
  const { slug } = await params
  const page = await getPage(`categoria-${slug}`).catch(() => null)
  if (page?.blocks && Array.isArray(page.blocks) && page.blocks.length > 0) {
    return <ChaiRender blocks={page.blocks as ChaiBlock[]} />
  }
  
  // Fallback
  return <div className="ft-container py-10"><h1>Categoría: {slug}</h1></div>
}
