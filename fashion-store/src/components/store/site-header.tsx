import { buildNav } from "@/lib/nav";
import { getSettings } from "@/lib/queries";
import { HeaderClient } from "./header-client";
import { AnnouncementBar } from "./announcement-bar";

export async function SiteHeader() {
  const [{ items, announcements }, settings] = await Promise.all([buildNav(), getSettings()]);
  return (
    <>
      <AnnouncementBar items={announcements} />
      <HeaderClient items={items} storeName={settings.storeName} />
    </>
  );
}
