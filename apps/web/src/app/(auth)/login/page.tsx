"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { useTranslation } from "../../../context/I18nContext";
import { useAuth } from "../../../context/AuthContext";
import { Logo } from "../../../components/Logo";
import { LanguageSelector } from "../../../components/LanguageSelector";

export default function LoginPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError(t("auth.invalidCredentials"));
      return;
    }

    try {
      setLoading(true);
      await signIn(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-anumaan-beige-50">
      {/* Top Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-anumaan-border-light bg-white/80 backdrop-blur-xs">
        <Logo showTagline={true} />
        <LanguageSelector variant="header" />
      </header>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-anumaan-border p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-anumaan-charcoal-900 font-devanagari">
              {t("auth.loginTitle")}
            </h1>
            <p className="text-sm text-anumaan-charcoal-500 font-devanagari mt-1">
              {t("auth.loginSubtitle")}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-devanagari">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
                {t("auth.emailLabel")}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-anumaan-charcoal-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-sans"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1 font-devanagari">
                {t("auth.passwordLabel")}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-anumaan-charcoal-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("auth.passwordPlaceholder")}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-md border border-anumaan-border focus:ring-1 focus:ring-anumaan-gold-500 focus:border-anumaan-gold-500 font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md bg-anumaan-charcoal-900 text-white text-sm font-semibold hover:bg-anumaan-charcoal-800 transition-colors font-devanagari disabled:opacity-60 shadow-xs"
            >
              <span>{loading ? t("auth.loggingIn") : t("auth.signInButton")}</span>
              <ArrowRight className="w-4 h-4 text-anumaan-gold-500" />
            </button>

            {/* Quick Demo Login Button for Instant Testing */}
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setEmail("engineer@anumaan.in");
                setPassword("Password123");
                try {
                  setLoading(true);
                  await signIn("engineer@anumaan.in", "Password123");
                  router.push("/dashboard");
                } catch (err: any) {
                  setError(err.message || "Failed to sign in.");
                } finally {
                  setLoading(false);
                }
              }}
              className="w-full py-2 px-4 rounded-md border border-anumaan-gold-500/50 bg-anumaan-gold-50/40 text-anumaan-charcoal-900 text-xs font-semibold hover:bg-anumaan-gold-50 transition-colors font-devanagari flex items-center justify-center gap-2"
            >
              <span>⚡ डेमों खात्यासह साइन इन करा (1-Click Demo Login)</span>
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-anumaan-border-light text-center">
            <p className="text-xs text-anumaan-charcoal-500 font-devanagari">
              {t("auth.needAccount")}{" "}
              <Link
                href="/signup"
                className="font-semibold text-anumaan-gold-600 hover:text-anumaan-gold-700 underline underline-offset-2 ml-1"
              >
                {t("auth.signUpButton")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
