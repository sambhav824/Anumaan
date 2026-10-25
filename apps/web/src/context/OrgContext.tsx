"use client";

import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
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
  user_role?: "owner" | "admin" | "member";
}

interface OrgContextType {
  organizations: Organization[];
  currentOrg: Organization | null;
  setCurrentOrg: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
  loading: boolean;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, session } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const isCreatingOrgRef = useRef<boolean>(false);

  const fetchOrgs = async () => {
    if (!session?.access_token) {
      setOrganizations([]);
      setCurrentOrg(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const orgs = await api.listOrganizations();

      if (orgs.length > 0) {
        setOrganizations(orgs);
        const savedId =
          typeof window !== "undefined"
            ? localStorage.getItem("anumaan_active_org_id")
            : null;
        const found = orgs.find((o) => o.id === savedId) || orgs[0];
        setCurrentOrg(found);
      } else if (!isCreatingOrgRef.current) {
        // Authenticated user has no organization yet: create default organization idempotently
        isCreatingOrgRef.current = true;
        try {
          const companyName =
            (user?.user_metadata?.company_name as string)?.trim() ||
            (user?.user_metadata?.full_name
              ? `${user.user_metadata.full_name}'s Company`
              : "My Construction Co");
          const ownerPerson =
            (user?.user_metadata?.full_name as string)?.trim() ||
            user?.email ||
            "Owner";

          const newOrg = await api.createOrganization({
            name: companyName,
            owner_person: ownerPerson,
            email: user?.email || undefined,
          });

          setOrganizations([newOrg]);
          setCurrentOrg(newOrg);
          if (typeof window !== "undefined") {
            try {
              localStorage.setItem("anumaan_active_org_id", newOrg.id);
            } catch {}
          }
        } catch (createErr) {
          console.error("Failed to auto-create initial organization:", createErr);
          setOrganizations([]);
          setCurrentOrg(null);
        } finally {
          isCreatingOrgRef.current = false;
        }
      } else {
        setOrganizations([]);
        setCurrentOrg(null);
      }
    } catch (err) {
      console.error("Failed to load user organizations:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, [session?.access_token]);

  const handleSetCurrentOrg = (org: Organization) => {
    setCurrentOrg(org);
    try {
      localStorage.setItem("anumaan_active_org_id", org.id);
    } catch {}
  };

  return (
    <OrgContext.Provider
      value={{
        organizations,
        currentOrg,
        setCurrentOrg: handleSetCurrentOrg,
        refreshOrganizations: fetchOrgs,
        loading,
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
