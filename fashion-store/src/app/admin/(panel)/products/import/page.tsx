import { PageHeader } from "@/components/admin/shell";
import { ProductImporter } from "@/components/admin/product-importer";
import { IMPORT_COLUMNS } from "@/lib/importer";

export const metadata = { title: "Import products" };

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Bulk import" description="Upload a CSV or XLSX file. Existing SKUs are updated, new SKUs create products — no duplicates." />
      <ProductImporter columns={[...IMPORT_COLUMNS]} />
    </>
  );
}
