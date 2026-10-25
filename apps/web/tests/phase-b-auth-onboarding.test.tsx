import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import LoginPage from "../src/app/(auth)/login/page";
import SignupPage from "../src/app/(auth)/signup/page";
import DashboardLayout from "../src/app/(dashboard)/layout";
import { validateOrgName } from "../src/lib/validation";

// Mock router
const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => "/dashboard",
}));

// Mock I18n
vi.mock("../src/context/I18nContext", () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, any>) => {
      const map: Record<string, string> = {
        "auth.loginTitle": "Sign in to Anumaan",
        "auth.loginSubtitle": "Access your projects and estimation tools",
        "auth.email": "Email Address",
        "auth.emailLabel": "Work Email",
        "auth.emailPlaceholder": "name@company.com",
        "auth.password": "Password",
        "auth.passwordLabel": "Password",
        "auth.passwordPlaceholder": "••••••••",
        "auth.signInButton": "Sign In",
        "auth.invalidCredentials": "Invalid email or password",
        "auth.signupTitle": "Create your account",
        "auth.signupSubtitle": "Start estimating today",
        "auth.fullName": "Full Name",
        "auth.fullNameLabel": "Full Name",
        "auth.fullNamePlaceholder": "राजेश देशमुख",
        "auth.companyName": "Company Name",
        "auth.signUpButton": "Create Account",
        "auth.passwordTooShort": "Password must be at least 8 characters",
        "auth.signupEmailPlaceholder": "rajesh@sahyadriinfra.in",
        "auth.emailNotConfirmedTitle": "Check Your Email",
        "auth.emailNotConfirmedDesc": "Please confirm your email address ({email}) to activate your account.",
        "auth.emailNotConfirmedAlert": "Your email address has not been confirmed yet. Please check your inbox for the activation link.",
        "auth.goToLogin": "Go to Login",
        "common.logout": "Log Out",
        "errors.unableToLoadOrgs": "Unable to Load Organizations",
        "errors.serverConnectionError": "An error occurred while connecting to the server.",
        "errors.retryConnection": "Retry Connection",
        "onboarding.setupBadge": "Setup",
        "onboarding.title": "Create your company",
        "onboarding.subtitle": "Start by registering your construction firm or contractor entity in Anumaan.",
        "onboarding.companyName": "Company Name",
        "onboarding.companyNamePlaceholder": "उदा. सह्याद्री इन्फ्रास्ट्रक्चर्स प्रायव्हेट लिमिटेड",
        "onboarding.contactPerson": "Contact Person",
        "onboarding.contactPersonPlaceholder": "उदा. अभि. राजेश देशमुख",
        "onboarding.gstinOptional": "GSTIN (Optional)",
        "onboarding.city": "City",
        "onboarding.cityPlaceholder": "उदा. पुणे",
        "onboarding.state": "State",
        "onboarding.statePlaceholder": "उदा. महाराष्ट्र",
        "onboarding.createButton": "Create Company",
        "onboarding.joiningTitle": "Joining an existing company?",
        "onboarding.joiningDesc": "If your firm already uses Anumaan, ask your organization administrator to add your email directly to their company membership. Once added, refresh this page to access your workspace.",
      };
      let text = map[key] || key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v));
        });
      }
      return text;
    },
    locale: "en",
  }),
}));

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockSignOut = vi.fn();

let mockAuthState = {
  user: { email: "test@example.com", user_metadata: { full_name: "Test User" } } as any,
  session: { access_token: "mock-token" } as any,
  loading: false,
  signIn: mockSignIn,
  signUp: mockSignUp,
  signOut: mockSignOut,
};

vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

let mockOrgState = {
  organizations: [] as any[],
  currentOrg: null as any,
  loading: false,
  isError: false,
  errorMessage: null as string | null,
  refreshOrganizations: vi.fn(),
  createOrg: vi.fn(),
};

vi.mock("../src/context/OrgContext", () => ({
  useOrg: () => mockOrgState,
}));

describe("Phase B: Organization Name Validation", () => {
  it("validates and normalizes organization names", () => {
    // Normal name
    const valid = validateOrgName("  सह्याद्री इन्फ्रास्ट्रक्चर्स  ");
    expect(valid.valid).toBe(true);
    expect(valid.normalized).toBe("सह्याद्री इन्फ्रास्ट्रक्चर्स");

    // Empty or whitespace
    expect(validateOrgName("   ").valid).toBe(false);

    // Too short
    expect(validateOrgName("A").valid).toBe(false);

    // Control characters
    expect(validateOrgName("Sahyadri\x00Infra").valid).toBe(false);

    // Zero-width characters
    expect(validateOrgName("Sahyadri\u200BInfra").valid).toBe(false);
  });
});

describe("Phase B: Authentication Flows", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("surfaces sign-in error cleanly", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("Invalid login credentials provided."));

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("name@company.com"), {
      target: { value: "wrong@company.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(screen.getByText("Invalid login credentials provided.")).toBeInTheDocument();
    });
  });

  it("detects email_not_confirmed error on login and shows verification guidance", async () => {
    const error: any = new Error("Email not confirmed");
    error.code = "email_not_confirmed";
    mockSignIn.mockRejectedValueOnce(error);

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText("name@company.com"), {
      target: { value: "unconfirmed@company.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Your email address has not been confirmed yet/i)
      ).toBeInTheDocument();
    });
  });

  it("handles signUp email confirmation flow", async () => {
    mockSignUp.mockResolvedValueOnce({
      needsEmailConfirmation: true,
      user: { email: "newuser@company.com" },
    });

    render(<SignupPage />);

    fireEvent.change(screen.getByPlaceholderText("राजेश देशमुख"), {
      target: { value: "New User" },
    });
    fireEvent.change(screen.getByPlaceholderText("rajesh@sahyadriinfra.in"), {
      target: { value: "newuser@company.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), {
      target: { value: "strongpassword123" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Create Account/i }));

    await waitFor(() => {
      expect(screen.getByText("Check Your Email")).toBeInTheDocument();
      expect(screen.getByText(/newuser@company.com/)).toBeInTheDocument();
      expect(screen.getByText("Go to Login")).toBeInTheDocument();
    });
  });
});

describe("Phase B: Dashboard Layout, Onboarding, and Error States", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows retry card on organization loading error (no onboarding, no children)", () => {
    mockOrgState = {
      organizations: [],
      currentOrg: null,
      loading: false,
      isError: true,
      errorMessage: "Database connection failed",
      refreshOrganizations: vi.fn(),
      createOrg: vi.fn(),
    };

    render(
      <DashboardLayout>
        <div data-testid="dashboard-content">Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("Unable to Load Organizations")).toBeInTheDocument();
    expect(screen.getByText("Database connection failed")).toBeInTheDocument();
    expect(screen.getByText("Retry Connection")).toBeInTheDocument();
    expect(screen.queryByTestId("dashboard-content")).not.toBeInTheDocument();
    expect(screen.queryByText("Create your company")).not.toBeInTheDocument();

    fireEvent.click(screen.getByText("Retry Connection"));
    expect(mockOrgState.refreshOrganizations).toHaveBeenCalledTimes(1);
  });

  it("shows non-dismissable onboarding view when organizations list is empty (no auto-create)", () => {
    mockOrgState = {
      organizations: [],
      currentOrg: null,
      loading: false,
      isError: false,
      errorMessage: null,
      refreshOrganizations: vi.fn(),
      createOrg: vi.fn(),
    };

    render(
      <DashboardLayout>
        <div data-testid="dashboard-content">Dashboard Content</div>
      </DashboardLayout>
    );

    expect(screen.getByText("Create your company")).toBeInTheDocument();
    expect(screen.getByText("Joining an existing company?")).toBeInTheDocument();
    expect(screen.getByText(/ask your organization administrator to add your email/i)).toBeInTheDocument();
    expect(screen.getAllByText("Log Out").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("dashboard-content")).not.toBeInTheDocument();
  });

  it("prevents double-submit on company creation", async () => {
    mockOrgState = {
      organizations: [],
      currentOrg: null,
      loading: false,
      isError: false,
      errorMessage: null,
      refreshOrganizations: vi.fn(),
      createOrg: vi.fn().mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 50))),
    };

    render(
      <DashboardLayout>
        <div>Content</div>
      </DashboardLayout>
    );

    const input = screen.getByPlaceholderText(/सह्याद्री इन्फ्रास्ट्रक्चर्स प्रायव्हेट लिमिटेड/i);
    fireEvent.change(input, { target: { value: "Apex Infra Projects" } });

    const submitBtn = screen.getByRole("button", { name: /Create Company/i });
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(mockOrgState.createOrg).toHaveBeenCalledTimes(1);
  });
});
