"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabaseClient";
import { setApiAuthToken, api } from "../lib/api";
import { useTranslation, Locale } from "./I18nContext";

export interface SignUpResult {
  needsEmailConfirmation: boolean;
  user: User | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, companyName?: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { setLocale } = useTranslation();

  useEffect(() => {
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
  }, [setLocale]);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const customErr = new Error(error.message) as any;
        customErr.code = (error as any).code || (error as any).status;
        throw customErr;
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
  ): Promise<SignUpResult> => {
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
        const customErr = new Error(error.message) as any;
        customErr.code = (error as any).code || (error as any).status;
        throw customErr;
      }

      setSession(data.session);
      setUser(data.user);
      setApiAuthToken(data.session?.access_token ?? null);

      const needsEmailConfirmation = Boolean(data.user && !data.session);
      return {
        needsEmailConfirmation,
        user: data.user,
      };
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
