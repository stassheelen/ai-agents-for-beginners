import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/admin/shell";
import { AdminFilters, Pagination } from "@/components/admin/filters";
import { Card, EmptyState, Table, TD, TH, THead, TR } from "@/components/ui/misc";
import { formatDate, formatMoney } from "@/lib/utils";

export const metadata = { title: "Customers" };
const PER_PAGE = 30;

export default async function CustomersPage(props: PageProps<"/admin/customers">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const where: Prisma.CustomerWhereInput = q
    ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { firstName: { contains: q, mode: "insensitive" } }, { lastName: { contains: q, mode: "insensitive" } }, { phone: { contains: q } }] }
    : {};
  const orderBy: Prisma.CustomerOrderByWithRelationInput = sort === "spent" ? { totalSpent: "desc" } : sort === "orders" ? { ordersCount: "desc" } : { createdAt: "desc" };
  const [total, customers, subscribers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({ where, orderBy, skip: (page - 1) * PER_PAGE, take: PER_PAGE }),
    prisma.subscriber.count(),
  ]);
  return (
    <>
      <PageHeader title="Customers" description={`${total} customers · ${subscribers} newsletter subscribers`} />
      <AdminFilters search={{ placeholder: "Name, email, phone…" }} selects={[{ name: "sort", label: "Newest first", options: [{ value: "spent", label: "Top spenders" }, { value: "orders", label: "Most orders" }] }]} />
      <Card>
        {customers.length === 0 ? (
          <EmptyState title="No customers yet" description="Customers are created automatically at checkout." />
        ) : (
          <>
            <Table>
              <THead>
                <tr>
                  <TH>Customer</TH>
                  <TH>Phone</TH>
                  <TH>City</TH>
                  <TH className="text-right">Orders</TH>
                  <TH className="text-right">Total spent</TH>
                  <TH>Since</TH>
                </tr>
              </THead>
              <tbody>
                {customers.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/admin/customers/${c.id}`} className="font-medium hover:underline">
                        {c.firstName} {c.lastName}
                      </Link>
                      <p className="text-[11px] text-muted-foreground">{c.email}</p>
                    </TD>
                    <TD>{c.phone}</TD>
                    <TD>{c.city}</TD>
                    <TD className="text-right">{c.ordersCount}</TD>
                    <TD className="text-right">{formatMoney(c.totalSpent)}</TD>
                    <TD className="text-muted-foreground">{formatDate(c.createdAt)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pages={Math.max(1, Math.ceil(total / PER_PAGE))} />
          </>
        )}
      </Card>
    </>
  );
}
