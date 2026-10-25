import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { I18nProvider, useTranslation } from "../src/context/I18nContext";
import { ProjectForm } from "../src/components/ProjectForm";
import { LanguageSelector } from "../src/components/LanguageSelector";

// Mock AuthContext for testing LanguageSelector
vi.mock("../src/context/AuthContext", () => ({
  useAuth: () => ({
    session: null,
    user: null,
  }),
}));

function TestContainer() {
  const { locale } = useTranslation();
  return (
    <div>
      <div data-testid="current-locale">{locale}</div>
      <LanguageSelector variant="settings" />
      <ProjectForm
        clients={[{ id: "client-1", name: "Pune Metro" }]}
        onSubmit={async () => {}}
        onCancel={() => {}}
      />
    </div>
  );
}

describe("Language Switch & Form Data Preservation Tests", () => {
  it("should preserve user-entered form data when switching interface languages", () => {
    const { container } = render(
      <I18nProvider>
        <TestContainer />
      </I18nProvider>
    );

    // Verify initial locale is English
    expect(screen.getByTestId("current-locale").textContent).toBe("en");

    // English label should be visible
    expect(screen.getByText(/Project Name/i)).toBeInTheDocument();

    // User types project name in Marathi / Devanagari into the input
    const input = container.querySelector('input[name="name"]') as HTMLInputElement;
    expect(input).not.toBeNull();
    fireEvent.change(input, { target: { value: "हिंजवडी वाकड मुख्य रस्ता" } });

    // Verify the value was entered
    expect((input as HTMLInputElement).value).toBe("हिंजवडी वाकड मुख्य रस्ता");

    // Switch language to Marathi ('mr')
    const marathiBtn = screen.getByText("मराठी");
    fireEvent.click(marathiBtn);

    // Verify locale switched to 'mr'
    expect(screen.getByTestId("current-locale").textContent).toBe("mr");

    // Verify Marathi label now appears
    expect(screen.getByText(/प्रकल्पाचे नाव/i)).toBeInTheDocument();

    // CRITICAL ACCEPTANCE CRITERIA: Form data MUST NOT be erased
    expect((input as HTMLInputElement).value).toBe("हिंजवडी वाकड मुख्य रस्ता");

    // Switch language to Hindi ('hi')
    const hindiBtn = screen.getByText("हिन्दी");
    fireEvent.click(hindiBtn);

    // Verify locale switched to 'hi'
    expect(screen.getByTestId("current-locale").textContent).toBe("hi");

    // Verify Hindi label now appears
    expect(screen.getByText(/परियोजना का नाम/i)).toBeInTheDocument();

    // Input value still perfectly preserved!
    expect((input as HTMLInputElement).value).toBe("हिंजवडी वाकड मुख्य रस्ता");
  });
});
