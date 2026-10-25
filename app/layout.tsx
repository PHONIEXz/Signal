import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";

const manrope = localFont({ src: "./fonts/manrope-latin.woff2", display: "swap", variable: "--font-manrope", weight: "200 800" });
import Providers from "./providers";

export const metadata: Metadata = {
  title: "SocialPanora | Your social world. One clear view.",
  applicationName: "SocialPanora",
  icons: { icon: "/socialpanora-icon.svg", apple: "/apple-touch-icon.png" },
  description: "Connect your social accounts and see every metric in one place.",
};

const themeInitScript = `
(function() {
  try {
    if (localStorage.getItem("theme") === "dark") {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={manrope.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
