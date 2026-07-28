/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "outline": "#76777d",
        "on-error-container": "#93000a",
        "tertiary-fixed": "#6ffbbe",
        "on-background": "#191c1e",
        "secondary-fixed": "#dbe1ff",
        "surface-container-lowest": "#ffffff",
        "surface-bright": "#f7f9fb",
        "on-tertiary": "#ffffff",
        "tertiary-fixed-dim": "#4edea3",
        "surface-container-high": "#e6e8ea",
        "on-surface": "#191c1e",
        "secondary-container": "#316bf3",
        "on-primary-fixed-variant": "#3f465c",
        "surface-container-low": "#f2f4f6",
        "on-secondary-fixed-variant": "#003ea8",
        "secondary-fixed-dim": "#b4c5ff",
        "tertiary-container": "#002113",
        "error-container": "#ffdad6",
        "inverse-on-surface": "#eff1f3",
        "on-primary": "#ffffff",
        "secondary": "#0051d5",
        "inverse-primary": "#bec6e0",
        "outline-variant": "#c6c6cd",
        "surface-dim": "#d8dadc",
        "surface-container": "#eceef0",
        "surface-container-highest": "#e0e3e5",
        "tertiary": "#000000",
        "primary-fixed-dim": "#bec6e0",
        "primary": "#0f172a",
        "on-primary-fixed": "#131b2e",
        "on-tertiary-fixed": "#002113",
        "surface-tint": "#565e74",
        "on-tertiary-fixed-variant": "#005236",
        "primary-container": "#131b2e",
        "background": "#f7f9fb",
        "on-primary-container": "#7c839b",
        "on-tertiary-container": "#009668",
        "surface-variant": "#e0e3e6",
        "surface": "#f7f9fb",
        "on-secondary-container": "#fefcff",
        "on-secondary": "#ffffff",
        "on-surface-variant": "#45464d",
        "inverse-surface": "#2d3133",
        "on-secondary-fixed": "#00174b",
        "on-error": "#ffffff",
        "error": "#ba1a1a",
        "primary-fixed": "#dae2fd"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "full": "9999px",
        "premium": "24px"
      },
      spacing: {
        "section-gap": "120px",
        "max-width": "1280px",
        "container-padding": "40px",
        "unit": "8px",
        "gutter": "24px",
        "margin-mobile": "20px"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        body: ["Inter", "sans-serif"]
      },
      fontSize: {
        "body-xl": ["20px", { lineHeight: "1.6", letterSpacing: "-0.01em", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "display-lg": ["72px", { lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "800" }],
        "display-md": ["48px", { lineHeight: "1.15", letterSpacing: "-0.03em", fontWeight: "700" }],
        "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg-mobile": ["28px", { lineHeight: "1.2", fontWeight: "700" }],
        "label-md": ["14px", { lineHeight: "1.4", letterSpacing: "0.05em", fontWeight: "600" }]
      }
    },
  },
  plugins: [],
}
