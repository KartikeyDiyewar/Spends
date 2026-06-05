/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0D0D12',
        surface: '#1A1A24',
        primary: '#FF4B4B',
        textPrimary: '#FFFFFF',
        textSecondary: '#A0A0AB',
        accent: '#262636'
      }
    },
  },
  plugins: [],
}
