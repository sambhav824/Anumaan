"use client";

import React, { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { Logo } from "../../components/Logo";
import { useAuth } from "../../context/AuthContext";
import { useOrg } from "../../context/OrgContext";
import { useRouter } from "next/navigation";
import { AlertCircle, RefreshCw, LogOut, Building, ShieldAlert, ArrowRight } from "lucide-react";
import { validateOrgName } from "../../lib/validation";
import { useTranslation } from "../../context/I18nContext";
import LocationPermissionModal from "../../components/LocationPermissionModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, locale } = useTranslation();
  const { session, loading: authLoading, signOut, user } = useAuth();
  const {
    organizations,
    currentOrg,
    loading: orgLoading,
    isError,
    errorMessage,
    refreshOrganizations,
    createOrg,
  } = useOrg();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Onboarding form state
  const [newOrgName, setNewOrgName] = useState("");
  const [ownerPerson, setOwnerPerson] = useState(user?.user_metadata?.full_name || "");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [gstin, setGstin] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !session) {
      router.replace("/login");
    }
  }, [session, authLoading, router]);

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingOrg) return; // double submit prevention

    setCreateError(null);
    const validation = validateOrgName(newOrgName);
    if (!validation.valid) {
      setCreateError(validation.error || "Invalid organization name.");
      return;
    }

    try {
      setCreatingOrg(true);
      await createOrg({
        name: validation.normalized,
        owner_person: ownerPerson.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
      });
    } catch (err: any) {
      setCreateError(err.message || "Failed to create company.");
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    router.replace("/login");
  };

  if (authLoading || orgLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F6FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#102F57] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-[#64748B] font-devanagari">
            {t("common.loading")}
          </p>
        </div>
      </div>
    );
  }

  // Error State: Show Retry Card (No onboarding, no auto-create)
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F3F6FA] p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-[#DCE4EE] p-6 text-center">
          <div className="w-12 h-12 bg-[#FDF2F2] text-[#C62828] rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#102F57] mb-2 font-devanagari">
            {t("errors.unableToLoadOrgs")}
          </h2>
          <p className="text-sm text-[#64748B] mb-6 font-devanagari">
            {errorMessage || t("errors.serverConnectionError")}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => refreshOrganizations()}
              className="w-full btn-primary font-devanagari"
            >
              <RefreshCw className="w-4 h-4" />
              {t("errors.retryConnection")}
            </button>
            <button
              onClick={handleLogout}
              className="w-full btn-secondary font-devanagari"
            >
              <LogOut className="w-4 h-4" />
              {t("common.logout")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Non-dismissable Onboarding Screen when user has zero organizations
  if (!isError && organizations.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F3F6FA]">
        <header className="px-6 py-3.5 flex items-center justify-between border-b border-[#DCE4EE] bg-white">
          <div className="flex items-center gap-3">
            <Logo showTagline={false} size="sm" />
            <span className="text-xs bg-[#FFF6EB] text-[#F7931E] border border-[#FCD6A8] px-2 py-0.5 rounded-full font-sans font-semibold">
              {t("onboarding.setupBadge")}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-[#64748B] hover:text-[#C62828] transition-colors font-medium font-devanagari"
          >
            <LogOut className="w-4 h-4" />
            {t("common.logout")}
          </button>
        </header>

        <main className="flex-1 flex items-center justify-center p-4 py-12">
          <div className="w-full max-w-lg space-y-6">
            {/* Create Company Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#DCE4EE] p-8">
              <div className="mb-6">
                <div className="w-12 h-12 bg-[#EEF3F9] text-[#102F57] rounded-xl flex items-center justify-center mb-3">
                  <Building className="w-6 h-6" />
                </div>
                <h1 className="text-xl font-bold text-[#102F57] font-devanagari">
                  {t("onboarding.title")}
                </h1>
                <p className="text-sm text-[#64748B] mt-1 font-devanagari">
                  {t("onboarding.subtitle")}
                </p>
              </div>

              {createError && (
                <div className="mb-4 p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded-lg flex items-start gap-2.5 text-sm text-[#C62828] font-devanagari">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1.5 font-devanagari">
                    {t("onboarding.companyName")} <span className="text-[#C62828]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newOrgName}
                    onChange={(e) => setNewOrgName(e.target.value)}
                    placeholder={t("onboarding.companyNamePlaceholder")}
                    className="w-full px-3.5 py-2.5 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1.5 font-devanagari">
                      {t("onboarding.contactPerson")}
                    </label>
                    <input
                      type="text"
                      value={ownerPerson}
                      onChange={(e) => setOwnerPerson(e.target.value)}
                      placeholder={t("onboarding.contactPersonPlaceholder")}
                      className="w-full px-3.5 py-2.5 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1.5 font-devanagari">
                      {t("onboarding.gstinOptional")}
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      onChange={(e) => setGstin(e.target.value)}
                      placeholder="27AAAAA0000A1Z5"
                      className="w-full px-3.5 py-2.5 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1.5 font-devanagari">
                      {t("onboarding.city")}
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t("onboarding.cityPlaceholder")}
                      className="w-full px-3.5 py-2.5 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#263445] uppercase tracking-wider mb-1.5 font-devanagari">
                      {t("onboarding.state")}
                    </label>
                    <input
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder={t("onboarding.statePlaceholder")}
                      className="w-full px-3.5 py-2.5 border border-[#DCE4EE] rounded-lg text-sm text-[#263445] placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-[#102F57]/15 focus:border-[#102F57] font-devanagari"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingOrg}
                  className="w-full mt-2 btn-primary font-devanagari"
                >
                  {creatingOrg ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t("onboarding.createButton")}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Administrator Guidance Card */}
            <div className="bg-white rounded-xl border border-[#DCE4EE] p-5 text-sm text-[#64748B] flex items-start gap-3.5 shadow-2xs">
              <div className="p-2 bg-[#EEF3F9] text-[#102F57] rounded-lg shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-[#102F57] mb-1 font-devanagari">
                  {t("onboarding.joiningTitle")}
                </h4>
                <p className="text-xs text-[#64748B] leading-relaxed font-devanagari">
                  {t("onboarding.joiningDesc")}
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F3F6FA]">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-[#102F57]/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 bg-white h-full shadow-2xl">
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <LocationPermissionModal />
    </div>
  );
}
