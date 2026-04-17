import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "sans-serif"],
        serif: ["var(--font-inter)", "Inter", "sans-serif"],
      },
      colors: {
        background: "#050505",
        foreground: "#f5f5f5",
        card: "#1a1a1a",
        "card-foreground": "#f5f5f5",
        popover: "#1a1a1a",
        "popover-foreground": "#f5f5f5",
        primary: "#FF5500",
        "primary-foreground": "#ffffff",
        secondary: "#1a1a1a",
        "secondary-foreground": "#f5f5f5",
        muted: "#2a2a2a",
        "muted-foreground": "#888888",
        accent: "#FF5500",
        "accent-foreground": "#ffffff",
        destructive: "#dc2626",
        "destructive-foreground": "#ffffff",
        border: "#2a2a2a",
        input: "#2a2a2a",
        ring: "#FF5500",
        gold: "#FFD700",
        "gold-foreground": "#000000",
        chart: {
          1: "#FF5500",
          2: "#FFD700",
          3: "#3a3a3a",
          4: "#888888",
          5: "#f5f5f5",
        },
        sidebar: "#0a0a0a",
        "sidebar-foreground": "#f5f5f5",
        "sidebar-primary": "#FF5500",
        "sidebar-primary-foreground": "#ffffff",
        "sidebar-accent": "#1a1a1a",
        "sidebar-accent-foreground": "#f5f5f5",
        "sidebar-border": "#2a2a2a",
        "sidebar-ring": "#FF5500",
        transparent: "transparent",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
}
export default config
