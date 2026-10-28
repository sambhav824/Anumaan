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
    <div className="min-h-screen flex flex-col bg-[#F3F6FA]">
      {/* Top Header */}
      <header className="px-6 py-3.5 flex items-center justify-between border-b border-[#DCE4EE] bg-white">
        <Logo showTagline={true} size="md" href="/login" />
        <LanguageSelector variant="header" />
      </header>

      {/* Main Signup Card */}
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-[#DCE4EE] p-8">
          {needsConfirmation ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 bg-[#EBF6F1] text-[#16835D] rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[#102F57] mb-2 font-devanagari">
                {t("auth.emailNotConfirmedTitle")}
              </h2>
              <p className="text-sm text-[#64748B] mb-6 leading-relaxed font-devanagari">
                {t("auth.emailNotConfirmedDesc", { email })}
              </p>
              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#102F57] hover:bg-[#0B2240] text-white rounded-lg transition-colors font-semibold text-sm font-devanagari"
              >
                {t("auth.goToLogin")}
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 text-center">
                <div className="flex justify-center mb-4">
                  <Logo size="lg" showTagline={false} href="/login" />
                </div>
                <h1 className="text-2xl font-bold text-[#102F57] font-devanagari">
                  {t("auth.signupTitle")}
                </h1>
                <p className="text-sm text-[#64748B] font-devanagari mt-1">
                  {t("auth.signupSubtitle")}
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3.5 bg-[#FDF2F2] border border-[#F8B4B4] rounded-xl flex items-start gap-2 text-sm text-[#C62828] font-devanagari">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1.5 font-devanagari">
                    {t("auth.fullNameLabel") || t("auth.fullName")}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={t("auth.fullNamePlaceholder") || "Er. Rajesh Deshmukh"}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1.5 font-devanagari">
                    {t("auth.companyNameLabel") || t("auth.companyName")}
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder={t("auth.companyNamePlaceholder") || "Sahyadri Infra Projects"}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1.5 font-devanagari">
                    {t("auth.emailLabel") || t("auth.email")}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth.signupEmailPlaceholder") || "rajesh@sahyadriinfra.in"}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1.5 font-devanagari">
                    {t("auth.passwordLabel") || t("auth.password")}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.passwordPlaceholder") || "••••••••"}
                      className="w-full pl-9 pr-3.5 py-2.5 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 flex items-center justify-center gap-2 px-5 py-2.5 bg-[#102F57] hover:bg-[#0B2240] text-white font-semibold rounded-lg shadow-xs transition-colors focus:ring-2 focus:ring-[#102F57]/30 disabled:opacity-50 font-devanagari"
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

              <div className="mt-6 text-center text-xs text-[#64748B] font-devanagari">
                {t("auth.haveAccount")}{" "}
                <Link href="/login" className="text-[#102F57] hover:text-[#F7931E] hover:underline font-semibold font-devanagari">
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
