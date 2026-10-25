"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

export default function HomePage() {
  const router = useRouter();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [session, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-anumaan-beige-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-anumaan-gold-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-anumaan-charcoal-600 font-devanagari">
          अनुमान लोड होत आहे...
        </p>
      </div>
    </div>
  );
}
