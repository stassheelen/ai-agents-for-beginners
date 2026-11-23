import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminShell } from "@/components/admin/shell";
import { directUploadEnabled } from "@/lib/storage";
import { prisma } from "@/lib/db";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  let admin;
  try {
    admin = await requireAdmin();
  } catch {
    redirect("/admin/login");
  }
  const newOrders = await prisma.order.count({ where: { status: "NEW" } });
  return (
    <AdminShell admin={{ email: admin.email, name: admin.name, role: admin.role }} directUpload={directUploadEnabled()} newOrders={newOrders}>
      {children}
    </AdminShell>
  );
}
