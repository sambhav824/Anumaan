"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { setApiAuthToken, api } from "../lib/api";
import { useTranslation, Locale } from "./I18nContext";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, companyName?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { setLocale } = useTranslation();

  useEffect(() => {
    // 1. Fetch initial active Supabase session
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setApiAuthToken(session?.access_token ?? null);

        if (session?.access_token) {
          api
            .getProfile()
            .then((profile) => {
              if (profile?.language_preference) {
                setLocale(profile.language_preference as Locale);
              }
            })
            .catch(() => {});
        }
      })
      .catch((err) => {
        console.error("Error retrieving Supabase session:", err);
      })
      .finally(() => {
        setLoading(false);
      });

    // 2. Listen to continuous Supabase auth state transitions
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setApiAuthToken(session?.access_token ?? null);

      if (session?.access_token) {
        api
          .getProfile()
          .then((profile) => {
            if (profile?.language_preference) {
              setLocale(profile.language_preference as Locale);
            }
          })
          .catch(() => {});
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      setSession(data.session);
      setUser(data.user);
      setApiAuthToken(data.session?.access_token ?? null);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    companyName?: string
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      setSession(data.session);
      setUser(data.user);
      setApiAuthToken(data.session?.access_token ?? null);

      if (data.user && !data.session) {
        throw new Error("Account created! Please check your email to confirm before logging in.");
      }
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("SignOut error:", err);
    } finally {
      try {
        localStorage.removeItem("anumaan_active_org_id");
      } catch {}
      setSession(null);
      setUser(null);
      setApiAuthToken(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
