import type { Metadata } from "next";
import { Inter, Manrope, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "../context/I18nContext";
import { AuthProvider } from "../context/AuthContext";
import { OrgProvider } from "../context/OrgContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const notoSansDevanagari = Noto_Sans_Devanagari({
  weight: ["400", "500", "600", "700"],
  subsets: ["devanagari"],
  variable: "--font-noto-sans-devanagari",
  display: "swap",
});

export const metadata: Metadata = {
  title: "अनुमान (Anumaan) — मिनटों में पूरा अनुमान।",
  description:
    "Professional Multilingual Construction Estimation & Quotation SaaS for Civil Engineers, Contractors, and Quantity Surveyors.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/assets/anumaan-symbol.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/assets/anumaan-symbol.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${notoSansDevanagari.variable}`}>
      <body className="font-sans min-h-screen bg-[#F3F6FA] text-[#263445] selection:bg-[#F7931E]/20 selection:text-[#102F57]">
        <I18nProvider>
          <AuthProvider>
            <OrgProvider>{children}</OrgProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
