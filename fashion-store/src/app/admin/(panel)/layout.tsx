import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin/shell";
import { blobEnabled } from "@/lib/storage";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
  return <AdminShell admin={{ email: admin.email, name: admin.name, role: admin.role }} directUpload={blobEnabled()}>{children}</AdminShell>;
}
