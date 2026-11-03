// Production backend URL is injected at build time via EXPO_PUBLIC_API_URL.
// Set it in mobile/.env — Expo embeds any EXPO_PUBLIC_* variable into the bundle.
export const ENV = {
  API_URL: process.env.EXPO_PUBLIC_API_URL ?? 'https://saas-attendance-app-production.up.railway.app/api',
};
