import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nProvider } from "../src/context/I18nContext";
import { Logo } from "../src/components/Logo";
import { Sidebar } from "../src/components/Sidebar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
}));

// Mock contexts
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "engineer@sahyadriinfra.in" },
    signOut: vi.fn(),
  }),
}));

vi.mock("../src/context/OrgContext", () => ({
  useOrg: () => ({
    currentOrg: { id: "org-1", name: "सह्याद्री इन्फ्रास्ट्रक्चर्स", user_role: "owner" },
    organizations: [{ id: "org-1", name: "सह्याद्री इन्फ्रास्ट्रक्चर्स" }],
    setCurrentOrg: vi.fn(),
  }),
}));

describe("Core Component Unit Tests", () => {
  it("renders Logo with brand name and official tagline", () => {
    render(
      <I18nProvider>
        <Logo showTagline={true} />
      </I18nProvider>
    );

    expect(screen.getByText("अनुमान")).toBeInTheDocument();
    expect(screen.getByText("Anumaan")).toBeInTheDocument();
    expect(screen.getByText("मिनटों में पूरा अनुमान।")).toBeInTheDocument();
  });

  it("renders Sidebar with enabled navigation and Coming Soon badges for unbuilt modules", () => {
    render(
      <I18nProvider>
        <Sidebar />
      </I18nProvider>
    );

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Estimates & BOQ")).toBeInTheDocument();
    expect(screen.getByText("Quotations")).toBeInTheDocument();
    expect(screen.getByText("Rate Library")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();

    // Verify 3 Coming Soon badges
    const badges = screen.getAllByText("Coming Soon");
    expect(badges.length).toBe(3);
  });
});
