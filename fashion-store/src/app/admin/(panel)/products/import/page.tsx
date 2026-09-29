import { PageHeader } from "@/components/admin/shell";
import { ProductImporter } from "@/components/admin/product-importer";
import { IMPORT_COLUMNS } from "@/lib/importer";

export const metadata = { title: "Імпорт товарів" };

export default function ImportPage() {
  return (
    <>
      <PageHeader title="Масовий імпорт" description="Завантажте файл CSV або XLSX. Наявні артикули оновлюються, нові — створюють товари. Без дублікатів." />
      <ProductImporter columns={[...IMPORT_COLUMNS]} />
    </>
  );
}
