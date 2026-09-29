import { ProductForm } from "@/components/admin/product-form";
import { productFormOptions } from "@/lib/admin-data";

export const metadata = { title: "Новий товар" };

export default async function NewProductPage() {
  const opts = await productFormOptions();
  return <ProductForm initial={null} {...opts} />;
}
