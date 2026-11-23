import { buildNav } from "@/lib/nav";
import { getSettings } from "@/lib/queries";
import { Suspense } from "react";
import { HeaderClient, HeaderWithParams } from "./header-client";
import { AnnouncementBar } from "./announcement-bar";

export async function SiteHeader() {
  const [{ items, announcements }, settings] = await Promise.all([buildNav(), getSettings()]);
  return (
    <>
      <AnnouncementBar items={announcements} />
      <Suspense fallback={<HeaderClient items={items} storeName={settings.storeName} flag={null} />}>
        <HeaderWithParams items={items} storeName={settings.storeName} />
      </Suspense>
    </>
  );
}
