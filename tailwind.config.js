/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind v4: scan all JS/TS/TSX files in the project
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './features/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {},
  },
  plugins: [],
};
