import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { defaultLocale, locales, type Locale } from "@/lib/i18n";

async function loadMessages(locale: Locale) {
  switch (locale) {
    case "am":
      return (await import("../src/messages/am.json")).default;
    case "sid":
      return (await import("../src/messages/sid.json")).default;
    case "en":
    default:
      return (await import("../src/messages/en.json")).default;
  }
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requestedLocale = cookieStore.get("NEXT_LOCALE")?.value;
  const locale = locales.includes((requestedLocale ?? defaultLocale) as Locale)
    ? ((requestedLocale ?? defaultLocale) as Locale)
    : defaultLocale;

  return {
    locale,
    messages: await loadMessages(locale),
  };
});
