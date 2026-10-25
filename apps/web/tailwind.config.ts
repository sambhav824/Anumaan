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
        anumaan: {
          white: "#FFFFFF",
          beige: {
            50: "#FCFAF7",
            100: "#F8F5EE",
            200: "#F1ECE2",
            300: "#E6DFC8",
          },
          charcoal: {
            900: "#141517",
            800: "#1C1E22",
            700: "#2B2F36",
            600: "#454A54",
            500: "#636A78",
            400: "#8D95A5",
          },
          gold: {
            50: "#FAF6ED",
            100: "#F4ECDA",
            500: "#C5A059",
            600: "#B38C45",
            700: "#947234",
          },
          border: {
            light: "#EFECE6",
            DEFAULT: "#E5E0D8",
            dark: "#D0C9BE",
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
        devanagari: [
          "var(--font-noto-sans-devanagari)",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
