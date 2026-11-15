/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./app/**/*.{js,jsx}",
        "./components/**/*.{js,jsx}",
        "./features/**/*.{js,jsx}",
        "./hooks/**/*.{js,jsx}",
        "./lib/**/*.{js,jsx}"
    ],
    theme: {
        extend: {
            colors: {
                ink: { 950: "#171717", 900: "#202020", 800: "#292929", 700: "#333333" },
                paper: "#e7edf7",
                brass: { 300: "#9bbcff", 400: "#6f9cf4", 500: "#4f73c8" },
                sage: "#8bd3c7"
            },
            fontFamily: {
                sans: ["var(--font-inter)", "var(--font-bangla)", "sans-serif"],
                serif: ["var(--font-inter)", "var(--font-bangla)", "sans-serif"]
            },
            boxShadow: { panel: "0 20px 60px rgba(0,0,0,.18)" }
        }
    },
    plugins: []
};
