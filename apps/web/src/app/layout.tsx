import type { Metadata } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "../context/I18nContext";
import { AuthProvider } from "../context/AuthContext";
import { OrgProvider } from "../context/OrgContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSansDevanagari.variable}`}>
      <body className="font-sans min-h-screen bg-anumaan-beige-50 text-anumaan-charcoal-900 selection:bg-anumaan-gold-100 selection:text-anumaan-charcoal-900">
        <I18nProvider>
          <AuthProvider>
            <OrgProvider>{children}</OrgProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
