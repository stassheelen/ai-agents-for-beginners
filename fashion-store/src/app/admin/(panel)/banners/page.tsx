import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { BannersManager } from "@/components/admin/banners-manager";

export const metadata = { title: "Banners" };

export default async function BannersPage() {
  const banners = await prisma.banner.findMany({ orderBy: [{ placement: "asc" }, { position: "asc" }] });
  return (
    <>
      <PageHeader title="Banners" description="Announcement bar messages, mega-menu promos and catalog / homepage banners. Optional schedule." />
      <BannersManager
        banners={banners.map((b) => ({
          id: b.id,
          placement: b.placement,
          title: b.title,
          subtitle: b.subtitle ?? "",
          image: b.image,
          mobileImage: b.mobileImage,
          buttonLabel: b.buttonLabel ?? "",
          link: b.link ?? "",
          active: b.active,
          startsAt: b.startsAt ? b.startsAt.toISOString().slice(0, 16) : "",
          endsAt: b.endsAt ? b.endsAt.toISOString().slice(0, 16) : "",
        }))}
      />
    </>
  );
}
