"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, User, Building, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { useTranslation } from "../../../context/I18nContext";
import { useAuth } from "../../../context/AuthContext";
import { Logo } from "../../../components/Logo";
import { LanguageSelector } from "../../../components/LanguageSelector";

export default function SignupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    try {
      setLoading(true);
      const res = await signUp(email, password, fullName, companyName);
      if (res.needsEmailConfirmation) {
        setNeedsConfirmation(true);
      } else {
        router.push("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
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

      {/* Main Signup Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-anumaan-border p-8">
          {needsConfirmation ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-anumaan-charcoal-900 mb-2 font-devanagari">
                {t("auth.emailNotConfirmedTitle")}
              </h2>
              <p className="text-sm text-anumaan-charcoal-600 mb-6 leading-relaxed font-devanagari">
                {t("auth.emailNotConfirmedDesc", { email })}
              </p>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-anumaan-gold-600 text-white rounded-lg hover:bg-anumaan-gold-700 transition-colors font-medium text-sm font-devanagari"
              >
                {t("auth.goToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <h1 className="text-2xl font-bold text-anumaan-charcoal-900 font-devanagari">
                  {t("auth.signupTitle")}
                </h1>
                <p className="text-sm text-anumaan-charcoal-500 font-devanagari mt-1">
                  {t("auth.signupSubtitle")}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-700 font-devanagari">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1.5 font-devanagari">
                    {t("auth.fullNameLabel") || t("auth.fullName")}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-anumaan-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("auth.fullNamePlaceholder") || "Er. Rajesh Deshmukh"}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-anumaan-border rounded-lg text-sm text-anumaan-charcoal-900 focus:outline-hidden focus:ring-2 focus:ring-anumaan-gold-500 font-devanagari"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1.5 font-devanagari">
                    {t("auth.companyNameLabel") || t("auth.companyName")}
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-anumaan-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={t("auth.companyNamePlaceholder") || "Sahyadri Infra Projects"}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-anumaan-border rounded-lg text-sm text-anumaan-charcoal-900 focus:outline-hidden focus:ring-2 focus:ring-anumaan-gold-500 font-devanagari"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1.5 font-devanagari">
                    {t("auth.emailLabel") || t("auth.email")}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-anumaan-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth.signupEmailPlaceholder") || "rajesh@sahyadriinfra.in"}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-anumaan-border rounded-lg text-sm text-anumaan-charcoal-900 focus:outline-hidden focus:ring-2 focus:ring-anumaan-gold-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-anumaan-charcoal-700 uppercase tracking-wider mb-1.5 font-devanagari">
                    {t("auth.passwordLabel") || t("auth.password")}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-anumaan-charcoal-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder") || "••••••••"}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-anumaan-border rounded-lg text-sm text-anumaan-charcoal-900 focus:outline-hidden focus:ring-2 focus:ring-anumaan-gold-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-2.5 bg-anumaan-gold-600 hover:bg-anumaan-gold-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-xs transition-colors font-devanagari"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t("auth.signUpButton")}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-xs text-anumaan-charcoal-500 font-devanagari">
                {t("auth.haveAccount")}{" "}
                <Link href="/login" className="text-anumaan-gold-700 hover:underline font-semibold font-devanagari">
                  {t("auth.signIn") || t("auth.signInButton")}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
