import { PageHeader } from "@/components/admin/shell";
import { MediaLibrary } from "@/components/admin/media";

export const metadata = { title: "Media" };

export default function MediaPage() {
  return (
    <>
      <PageHeader title="Media" description="Images and videos stored in Vercel Blob (or /public/uploads in local development)." />
      <MediaLibrary />
    </>
  );
}
