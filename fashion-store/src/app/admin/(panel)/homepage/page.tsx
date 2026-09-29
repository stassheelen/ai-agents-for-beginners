import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { HomepageEditor, type SectionRow } from "@/components/admin/homepage-editor";

export const metadata = { title: "Homepage" };

export default async function HomepageAdmin() {
  const [sections, categories, collections] = await Promise.all([
    prisma.homepageSection.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }] }),
    prisma.category.findMany({ orderBy: [{ position: "asc" }], select: { name: true, slug: true, parentId: true } }),
    prisma.collection.findMany({ orderBy: { position: "asc" }, select: { name: true, slug: true } }),
  ]);
  const rows: SectionRow[] = sections.map((s) => ({
    id: s.id,
    type: s.type,
    label: s.label ?? "",
    title: s.title ?? "",
    subtitle: s.subtitle ?? "",
    body: s.body ?? "",
    image: s.image,
    mobileImage: s.mobileImage,
    videoUrl: s.videoUrl,
    buttonLabel: s.buttonLabel ?? "",
    buttonLink: s.buttonLink ?? "",
    button2Label: s.button2Label ?? "",
    button2Link: s.button2Link ?? "",
    background: s.background ?? "",
    textColor: s.textColor ?? "",
    active: s.active,
    config: (s.config ?? {}) as SectionRow["config"],
  }));
  return (
    <>
      <PageHeader title="Homepage" description="Every block on the storefront homepage is managed here. Changes are live immediately." />
      <HomepageEditor sections={rows} categories={categories} collections={collections} />
    </>
  );
}
