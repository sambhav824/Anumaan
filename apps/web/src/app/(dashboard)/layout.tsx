"use client";

import React, { useState } from "react";
import { Sidebar } from "../../components/Sidebar";
import { Header } from "../../components/Header";
import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { session, loading } = useAuth();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If not logged in and auth finished loading, redirect to login
  React.useEffect(() => {
    if (!loading && !session) {
      router.replace("/login");
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-anumaan-beige-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-anumaan-gold-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-anumaan-charcoal-600 font-devanagari">
            लोड होत आहे...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-anumaan-beige-50/70">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-anumaan-charcoal-900/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 bg-white h-full shadow-2xl">
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMenuToggle={() => setMobileMenuOpen(true)} />
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
