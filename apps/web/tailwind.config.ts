import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: {
            DEFAULT: "#102F57",
            hover: "#0B2240",
            dark: "#081930",
            light: "#EEF3F9",
            50: "#F0F4F9",
            100: "#DCE6F2",
            200: "#B8CDE3",
            600: "#143A6B",
            700: "#102F57",
            800: "#102F57",
            900: "#0B2240",
          },
          orange: {
            DEFAULT: "#F7931E",
            hover: "#E28113",
            active: "#C66D08",
            light: "#FFF6EB",
            50: "#FFF6EB",
            100: "#FEEAD3",
            200: "#FCD6A8",
            500: "#F7931E",
            600: "#E28113",
            700: "#C66D08",
          },
          bg: "#F3F6FA",
          surface: "#FFFFFF",
          text: {
            primary: "#263445",
            secondary: "#64748B",
            muted: "#94A3B8",
          },
          border: {
            DEFAULT: "#DCE4EE",
            light: "#EAEFF5",
            dark: "#B8C9DC",
          },
          table: {
            header: "#E8EEF5",
          },
          status: {
            success: "#16835D",
            warning: "#B86B08",
            error: "#C62828",
          },
        },
        // Backwards-compatible aliases updated to the new design system
        anumaan: {
          navy: "#102F57",
          orange: "#F7931E",
          white: "#FFFFFF",
          beige: {
            50: "#F3F6FA", // Main Background
            100: "#E8EEF5", // Table Header / light tint
            200: "#DCE4EE", // Borders / Dividers
            300: "#CAD5E2",
          },
          charcoal: {
            900: "#102F57", // Primary Navy for headings
            800: "#263445", // Primary Text
            700: "#334155",
            600: "#64748B", // Secondary Text
            500: "#64748B",
            400: "#94A3B8",
            300: "#CBD5E1",
          },
          gold: {
            50: "#FFF6EB", // Orange 50
            100: "#FEEAD3", // Orange 100
            200: "#FCD6A8", // Orange 200
            500: "#F7931E", // Construction Orange CTA
            600: "#E28113", // Hover
            700: "#102F57", // Primary Navy accent
            800: "#0B2240",
            900: "#081930",
          },
          border: {
            light: "#EAEFF5",
            DEFAULT: "#DCE4EE",
            dark: "#B8C9DC",
          },
        },
      },
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "var(--font-noto-sans-devanagari)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        heading: [
          "var(--font-manrope)",
          "var(--font-inter)",
          "var(--font-noto-sans-devanagari)",
          "sans-serif",
        ],
        devanagari: [
          "var(--font-noto-sans-devanagari)",
          "sans-serif",
        ],
      },
      boxShadow: {
        "2xs": "0 1px 2px 0 rgba(16, 47, 87, 0.04)",
        "xs": "0 1px 2px 0 rgba(16, 47, 87, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
