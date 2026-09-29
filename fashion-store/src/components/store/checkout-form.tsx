"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { checkPromo, npSearchCities, npWarehouses, placeOrder } from "@/actions/checkout";
import { cn, formatMoney } from "@/lib/utils";
import { useStore } from "./store-context";

type Totals = { subtotal: number; shipping: number; discount: number; total: number };

export function CheckoutForm({
  freeShippingThreshold,
  shippingFlatRate,
  npEnabled,
  cardOnline,
  deliveryMethods,
}: {
  freeShippingThreshold: number;
  shippingFlatRate: number;
  npEnabled: boolean;
  cardOnline: boolean;
  deliveryMethods: { id: string; label: string }[];
}) {
  const { cart, cartLoaded } = useStore();
  const router = useRouter();
  const [form, setForm] = React.useState({
    firstName: "",
    lastName: "",
    phone: "+380",
    email: "",
    city: "",
    deliveryMethod: deliveryMethods[0].id,
    deliveryAddress: "",
    paymentMethod: "cod" as "cod" | "card",
    comment: "",
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [promoInput, setPromoInput] = React.useState("");
  const [promo, setPromo] = React.useState<{ code: string; totals: Totals; description: string | null } | null>(null);
  const [promoError, setPromoError] = React.useState<string | null>(null);
  const [cityRef, setCityRef] = React.useState<string | null>(null);
  const [cityResults, setCities] = React.useState<{ ref: string; name: string; area?: string }[]>([]);
  const [warehouseResults, setWarehouseResults] = React.useState<{ ref: string; name: string }[]>([]);
  const [payForm, setPayForm] = React.useState<{ action: string; fields: Record<string, string> } | null>(null);
  const payFormRef = React.useRef<HTMLFormElement>(null);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  // re-validate promo when cart changes
  const [prevSubtotal, setPrevSubtotal] = React.useState(cart.subtotal);
  if (prevSubtotal !== cart.subtotal) {
    setPrevSubtotal(cart.subtotal);
    setPromo(null);
  }

  // Nova Poshta city autocomplete (only when API key configured)
  const citySearchOn = npEnabled && !cityRef && form.city.trim().length >= 2;
  React.useEffect(() => {
    if (!citySearchOn) return;
    const t = setTimeout(() => npSearchCities(form.city).then(setCities), 250);
    return () => clearTimeout(t);
  }, [form.city, citySearchOn]);
  const cities = citySearchOn ? cityResults : [];

  const warehousesOn = npEnabled && Boolean(cityRef) && form.deliveryMethod === "nova_poshta_branch";
  React.useEffect(() => {
    if (!warehousesOn || !cityRef) return;
    let alive = true;
    npWarehouses(cityRef).then((w) => alive && setWarehouseResults(w));
    return () => {
      alive = false;
    };
  }, [cityRef, warehousesOn]);
  const warehouses = warehousesOn ? warehouseResults : [];

  React.useEffect(() => {
    if (payForm) payFormRef.current?.submit();
  }, [payForm]);

  const baseShipping = cart.subtotal >= freeShippingThreshold ? 0 : shippingFlatRate;
  const totals: Totals = promo?.totals ?? { subtotal: cart.subtotal, shipping: baseShipping, discount: 0, total: cart.subtotal + baseShipping };

  const applyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoError(null);
    const res = await checkPromo(promoInput);
    if (res.ok) {
      setPromo({ code: res.code, totals: res.totals, description: res.description });
      toast.success("Промокод застосовано");
    } else setPromoError(res.error);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await placeOrder({ ...form, promoCode: promo?.code });
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        toast.error(res.error);
        setSubmitting(false);
        return;
      }
      if (res.payment.kind === "form") {
        setPayForm({ action: res.payment.action, fields: res.payment.fields });
        return;
      }
      if (res.payment.kind === "redirect") {
        window.location.href = res.payment.url;
        return;
      }
      router.replace(`/checkout/success?order=${res.orderId}&t=${res.token}`);
    } catch {
      toast.error("Не вдалося оформити замовлення. Спробуйте ще раз.");
      setSubmitting(false);
    }
  };

  if (cartLoaded && cart.items.length === 0 && !submitting) {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-display text-3xl">Кошик порожній</h1>
        <p className="text-sm text-muted-foreground">Додайте товари, щоб оформити замовлення.</p>
        <Button asChild>
          <Link href="/shop">До каталогу</Link>
        </Button>
      </div>
    );
  }

  const field = (k: keyof typeof form, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={`co-${k}`}>{label}</Label>
      <Input id={`co-${k}`} value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={Boolean(errors[k])} {...props} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <>
    <form onSubmit={submit} className="grid gap-10 lg:grid-cols-[1fr_420px] lg:gap-16">
      <div className="space-y-10">
        <section>
          <h2 className="eyebrow mb-5">1. Контактні дані</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field("firstName", "Ім'я *", { autoComplete: "given-name", required: true })}
            {field("lastName", "Прізвище *", { autoComplete: "family-name", required: true })}
            {field("phone", "Телефон *", { autoComplete: "tel", type: "tel", required: true })}
            {field("email", "Email *", { autoComplete: "email", type: "email", required: true })}
          </div>
        </section>

        <section>
          <h2 className="eyebrow mb-5">2. Доставка</h2>
          <div className="space-y-2">
            {deliveryMethods.map((d) => (
              <label key={d.id} className={cn("flex cursor-pointer items-center justify-between gap-3 border px-4 py-3.5 text-sm", form.deliveryMethod === d.id ? "border-foreground" : "border-border")}>
                <span className="flex items-center gap-3">
                  <input type="radio" name="delivery" checked={form.deliveryMethod === d.id} onChange={() => set("deliveryMethod", d.id)} className="accent-black" />
                  {d.label}
                </span>
                <span className="text-xs text-muted-foreground">{totals.shipping === 0 ? "Безкоштовно" : formatMoney(totals.shipping)}</span>
              </label>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="relative space-y-1.5">
              <Label htmlFor="co-city">Місто *</Label>
              <Input
                id="co-city"
                value={form.city}
                autoComplete="address-level2"
                onChange={(e) => {
                  set("city", e.target.value);
                  setCityRef(null);
                }}
                aria-invalid={Boolean(errors.city)}
                required
              />
              {cities.length > 0 && (
                <ul className="absolute inset-x-0 top-full z-10 max-h-64 overflow-y-auto border border-border bg-white shadow-sm">
                  {cities.map((c) => (
                    <li key={c.ref}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          set("city", c.name);
                          setCityRef(c.ref);
                          setCities([]);
                        }}
                      >
                        {c.name} {c.area && <span className="text-xs text-muted-foreground">({c.area})</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {errors.city && <p className="text-xs text-destructive">{errors.city}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-address">{form.deliveryMethod === "nova_poshta_branch" ? "Відділення / поштомат *" : "Адреса (вулиця, будинок, квартира) *"}</Label>
              {warehouses.length > 0 ? (
                <select id="co-address" value={form.deliveryAddress} onChange={(e) => set("deliveryAddress", e.target.value)} className="h-11 w-full border border-input bg-white px-3 text-sm" required>
                  <option value="">Оберіть відділення</option>
                  {warehouses.map((w) => (
                    <option key={w.ref} value={w.name}>
                      {w.name}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id="co-address"
                  value={form.deliveryAddress}
                  onChange={(e) => set("deliveryAddress", e.target.value)}
                  placeholder={form.deliveryMethod === "nova_poshta_branch" ? "Напр. Відділення №12" : ""}
                  aria-invalid={Boolean(errors.deliveryAddress)}
                  required
                />
              )}
              {errors.deliveryAddress && <p className="text-xs text-destructive">{errors.deliveryAddress}</p>}
            </div>
          </div>
        </section>

        <section>
          <h2 className="eyebrow mb-5">3. Оплата</h2>
          <div className="space-y-2">
            {[
              { id: "cod", label: "Оплата при отриманні", hint: "Накладений платіж у відділенні Нової Пошти" },
              { id: "card", label: "Оплата карткою", hint: cardOnline ? "Visa / Mastercard / Apple Pay / Google Pay — безпечна онлайн-оплата" : "Менеджер надішле посилання на оплату після підтвердження замовлення" },
            ].map((p) => (
              <label key={p.id} className={cn("flex cursor-pointer items-start gap-3 border px-4 py-3.5 text-sm", form.paymentMethod === p.id ? "border-foreground" : "border-border")}>
                <input type="radio" name="payment" className="mt-1 accent-black" checked={form.paymentMethod === p.id} onChange={() => set("paymentMethod", p.id)} />
                <span>
                  {p.label}
                  <span className="mt-0.5 block text-xs text-muted-foreground">{p.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="co-comment">Коментар до замовлення</Label>
            <Textarea id="co-comment" value={form.comment} onChange={(e) => set("comment", e.target.value)} maxLength={500} className="min-h-20" />
          </div>
        </section>
      </div>

      {/* Summary */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="bg-soft p-5 lg:p-7">
          <h2 className="eyebrow mb-5">Ваше замовлення ({cart.count})</h2>
          <ul className="max-h-[340px] space-y-4 overflow-y-auto">
            {cart.items.map((i) => (
              <li key={i.id} className="flex gap-3">
                <div className="relative aspect-[4/5] w-16 shrink-0 bg-muted">
                  {i.image && <Image src={i.image} alt={i.name} fill sizes="64px" className="object-cover" />}
                  <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] text-white">{i.quantity}</span>
                </div>
                <div className="flex flex-1 justify-between gap-2 text-sm">
                  <div>
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{[i.color, i.size].filter(Boolean).join(" / ")}</p>
                  </div>
                  <p className="shrink-0">{formatMoney(i.unitPrice * i.quantity)}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-6 border-t border-border pt-5">
            {promo ? (
              <div className="flex items-center justify-between text-sm">
                <span>
                  Промокод <strong>{promo.code}</strong>
                  {promo.description && <span className="block text-xs text-muted-foreground">{promo.description}</span>}
                </span>
                <button type="button" onClick={() => setPromo(null)} className="text-xs underline">
                  Видалити
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input value={promoInput} onChange={(e) => setPromoInput(e.target.value.toUpperCase())} placeholder="Промокод" aria-label="Промокод" className="h-10" />
                <Button type="button" variant="outline" size="sm" className="h-10" onClick={applyPromo}>
                  Застосувати
                </Button>
              </div>
            )}
            {promoError && <p className="mt-2 text-xs text-destructive">{promoError}</p>}
          </div>

          <dl className="mt-5 space-y-2 border-t border-border pt-5 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Підсумок</dt>
              <dd>{formatMoney(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-destructive">
                <dt>Знижка</dt>
                <dd>−{formatMoney(totals.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Доставка</dt>
              <dd>{totals.shipping === 0 ? "Безкоштовно" : formatMoney(totals.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-3 text-base font-medium">
              <dt>До сплати</dt>
              <dd>{formatMoney(totals.total)}</dd>
            </div>
          </dl>
          <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting || !cartLoaded || cart.items.length === 0}>
            {submitting ? <Loader2 className="animate-spin" /> : <Lock />}
            {form.paymentMethod === "card" && cardOnline ? "Перейти до оплати" : "Підтвердити замовлення"}
          </Button>
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Натискаючи кнопку, ви погоджуєтесь з <Link href="/help/delivery" className="underline">умовами доставки</Link> та{" "}
            <Link href="/help/returns" className="underline">повернення</Link>.
          </p>
        </div>
      </aside>
    </form>
      {payForm && (
        <form ref={payFormRef} method="POST" action={payForm.action} className="hidden">
          {Object.entries(payForm.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        </form>
      )}
    </>
  );
}
