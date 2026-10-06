import { ExternalLink, Truck } from "lucide-react";

type Supplier = { supplier: string | null; supplierSku: string | null; supplierUrl: string | null };

/** Supplier of an order line (snapshot taken at checkout, else the product's current one). */
export function SupplierLine({ item, product }: { item: Supplier; product?: Supplier | null }) {
  const s = item.supplier || item.supplierSku || item.supplierUrl ? item : product;
  if (!s || !(s.supplier || s.supplierSku || s.supplierUrl)) return <p className="mt-0.5 text-[11px] text-muted-foreground/70">Постачальник не вказаний</p>;
  return (
    <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
      <Truck className="size-3 shrink-0" />
      <span className="font-medium text-foreground/80">{s.supplier ?? "Постачальник"}</span>
      {s.supplierSku && <span>· арт. {s.supplierSku}</span>}
      {s.supplierUrl && (
        <a href={s.supplierUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline-offset-2 hover:text-foreground hover:underline">
          · у постачальника <ExternalLink className="size-3" />
        </a>
      )}
    </p>
  );
}
