import { PageHeader } from "@/components/admin/shell";
import { MediaLibrary } from "@/components/admin/media";

export const metadata = { title: "Медіа" };

export default function MediaPage() {
  return (
    <>
      <PageHeader title="Медіа" description="Зображення та відео у сховищі Vercel Blob (локально — у /public/uploads)." />
      <MediaLibrary />
    </>
  );
}
