import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import PageEditor from "@/components/admin/PageEditor";

async function savePage(pageId: string, formData: FormData) {
  "use server";
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const blocks = formData.get("blocks") as string;
  const status = formData.get("status") as string;

  await db.page.update({
    where: { id: pageId },
    data: { title, slug, blocks, status },
  });
  revalidatePath(`/admin/pages/${pageId}`);
  revalidatePath(`/admin/pages`);
}

async function publishPage(pageId: string) {
  "use server";
  await db.page.update({ where: { id: pageId }, data: { status: "PUBLISHED" } });
  revalidatePath(`/admin/pages/${pageId}`);
}

export default async function PageEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (id === "new") {
    // Create new page and redirect
    const page = await db.page.create({
      data: { slug: "nueva-pagina", title: "Nueva Página", blocks: "[]" },
    });
    redirect(`/admin/pages/${page.id}`);
  }

  const page = await db.page.findUnique({ where: { id } });
  if (!page) return <div className="p-8">Página no encontrada</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Editor: {page.title}</h1>
      <PageEditor page={page} saveAction={savePage.bind(null, id)} publishAction={publishPage.bind(null, id)} />
    </div>
  );
}
