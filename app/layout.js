import { cookies } from "next/headers";
import {
  Geist,
  Geist_Mono,
  IBM_Plex_Sans_Thai,
  IBM_Plex_Sans_Thai_Looped,
  Sarabun,
} from "next/font/google";
import Providers from "@/components/Providers";
import Shell from "@/components/Shell";
import "katex/dist/katex.min.css";
import "./globals.css";
import "./pages.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const thaiSans = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai-sans",
  display: "swap",
});
const thaiLooped = IBM_Plex_Sans_Thai_Looped({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-thai-looped",
  display: "swap",
});
const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata = {
  title: { default: "Summy", template: "%s · Summy" },
  description: "Personal learning library & documentation reader",
};

const pick = (v, allowed, d) => (allowed.includes(v) ? v : d);

export default async function RootLayout({ children }) {
  const c = await cookies();
  const locale = pick(c.get("summy_locale")?.value, ["th", "en"], "th");
  const theme = pick(c.get("summy_theme")?.value, ["light", "dark", "system"], "system");
  const width = pick(c.get("summy_w")?.value, ["narrow", "comfortable", "wide"], "comfortable");
  const docFont = pick(c.get("summy_df")?.value, ["looped", "sarabun", "sans"], "looped");
  const fs = Number(c.get("summy_fs")?.value);
  const fontSize = fs >= 14 && fs <= 24 ? fs : 17;

  return (
    <html
      lang={locale}
      data-theme={theme}
      data-doc-font={docFont}
      className={`${geist.variable} ${geistMono.variable} ${thaiSans.variable} ${thaiLooped.variable} ${sarabun.variable}`}
      style={{ "--reader-size": `${fontSize}px` }}
      suppressHydrationWarning
    >
      <body>
        <Providers initial={{ locale, theme, fontSize, width, docFont }}>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
