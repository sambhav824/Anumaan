import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { I18nProvider, useTranslation, Locale } from "../src/context/I18nContext";
import { Sidebar } from "../src/components/Sidebar";

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Mock contexts
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    user: { email: "engineer@sahyadriinfra.in" },
    session: { access_token: "mock-token" },
    signOut: vi.fn(),
  }),
}));

vi.mock("../src/context/OrgContext", () => ({
  useOrg: () => ({
    currentOrg: { id: "org-1", name: "Sahyadri Infra", user_role: "owner" },
    organizations: [{ id: "org-1", name: "Sahyadri Infra" }],
    setCurrentOrg: vi.fn(),
  }),
}));

function LocaleTester({ onRender }: { onRender: (setter: (l: Locale) => void) => void }) {
  const { setLocale } = useTranslation();
  React.useEffect(() => {
    onRender(setLocale);
  }, [setLocale, onRender]);
  return <Sidebar />;
}

describe("Comprehensive Multilingual Dynamic Switch Audit", () => {
  it("renders 100% English navigation when English is selected", async () => {
    let changeLocale: (l: Locale) => void = () => {};
    render(
      <I18nProvider>
        <LocaleTester onRender={(fn) => { changeLocale = fn; }} />
      </I18nProvider>
    );

    act(() => {
      changeLocale("en");
    });

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.getByText("Estimates & BOQ")).toBeInTheDocument();
    expect(screen.getByText("Quotations")).toBeInTheDocument();
    expect(screen.getByText("Rate Library")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders 100% Marathi navigation when Marathi is selected", async () => {
    let changeLocale: (l: Locale) => void = () => {};
    render(
      <I18nProvider>
        <LocaleTester onRender={(fn) => { changeLocale = fn; }} />
      </I18nProvider>
    );

    act(() => {
      changeLocale("mr");
    });

    expect(screen.getByText("डॅशबोर्ड")).toBeInTheDocument();
    expect(screen.getByText("प्रकल्प")).toBeInTheDocument();
    expect(screen.getByText("ग्राहक")).toBeInTheDocument();
    expect(screen.getByText("अंदाजपत्रक व BOQ")).toBeInTheDocument();
    expect(screen.getByText("दरपत्रक")).toBeInTheDocument();
    expect(screen.getByText("दर सूची")).toBeInTheDocument();
    expect(screen.getByText("सेटिंग्ज")).toBeInTheDocument();
  });

  it("renders 100% Hindi navigation when Hindi is selected", async () => {
    let changeLocale: (l: Locale) => void = () => {};
    render(
      <I18nProvider>
        <LocaleTester onRender={(fn) => { changeLocale = fn; }} />
      </I18nProvider>
    );

    act(() => {
      changeLocale("hi");
    });

    expect(screen.getByText("डैशबोर्ड")).toBeInTheDocument();
    expect(screen.getByText("परियोजनाएँ")).toBeInTheDocument();
    expect(screen.getByText("ग्राहक")).toBeInTheDocument();
    expect(screen.getByText("अनुमान व BOQ")).toBeInTheDocument();
    expect(screen.getByText("कोटेशन")).toBeInTheDocument();
    expect(screen.getByText("दर सूची")).toBeInTheDocument();
    expect(screen.getByText("सेटिंग्स")).toBeInTheDocument();
  });
});
