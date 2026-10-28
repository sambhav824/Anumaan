"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";

export interface Organization {
  id: string;
  name: string;
  owner_person?: string;
  email?: string;
  phone?: string;
  business_address?: string;
  city?: string;
  state?: string;
  pin_code?: string;
  gstin?: string;
  logo_url?: string;
  created_by?: string;
  user_role?: "owner" | "admin" | "member";
}

interface OrgContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
  loading: boolean;
  isError: boolean;
  errorMessage: string | null;
  createOrg: (data: Partial<Organization>) => Promise<Organization>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOrgs = useCallback(async () => {
    if (!session?.access_token) {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
      setIsError(false);
      setErrorMessage(null);
      return;
    }

    try {
      setLoading(true);
      setIsError(false);
      setErrorMessage(null);

      const orgs = await api.listOrganizations();
      setOrganizations(orgs);

      if (orgs.length > 0) {
        const savedId =
          typeof window !== "undefined"
            ? localStorage.getItem("anumaan_active_org_id")
            : null;
        const found = orgs.find((o) => o.id === savedId);
        if (found) {
          setCurrentOrg(found);
        } else {
          // Stale stored org ID is cleared from localStorage
          if (typeof window !== "undefined") {
            try {
              localStorage.removeItem("anumaan_active_org_id");
            } catch {}
          }
          setCurrentOrg(orgs[0]);
        }
      } else {
        // Successful empty list: user has zero organizations
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("anumaan_active_org_id");
          } catch {}
        }
        setCurrentOrg(null);
      }
    } catch (err: any) {
      console.error("Failed to load user organizations:", err);
      setIsError(true);
      setErrorMessage(err.message || "Failed to load organizations. Please try again.");
      setOrganizations([]);
      setCurrentOrg(null);
    } finally {
      setLoading(false);
    }
  }, [session?.access_token]);

  useEffect(() => {
    fetchOrgs();
  }, [fetchOrgs]);

  const handleSetCurrentOrg = (org: Organization) => {
    setCurrentOrg(org);
    try {
      localStorage.setItem("anumaan_active_org_id", org.id);
    } catch {}
  };

  const createOrg = async (data: Partial<Organization>): Promise<Organization> => {
    const newOrg = await api.createOrganization(data);
    await fetchOrgs();
    setCurrentOrg(newOrg);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("anumaan_active_org_id", newOrg.id);
      } catch {}
    }
    return newOrg;
  };

  return (
    <OrgContext.Provider
      value={{
        organizations,
        currentOrg,
        setCurrentOrg: handleSetCurrentOrg,
        refreshOrganizations: fetchOrgs,
        loading,
        isError,
        errorMessage,
        createOrg,
      }}
    >
      {children}
    </OrgContext.Provider>
  );
}

export function useOrg() {
  const context = useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return context;
}

export function useSafeOrg() {
  return useContext(OrgContext);
}

