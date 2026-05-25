/** Strip deploy/dev jargon from messages shown in the UI. */
export function friendlyCloudError(
  message: string | null | undefined
): string {
  if (!message?.trim()) return "Something went wrong. Try again.";
  const m = message;
  if (
    m.includes("<!DOCTYPE") ||
    m.includes("not valid JSON") ||
    m.includes("VITE_") ||
    m.includes("Netlify") ||
    m.includes("Render URL") ||
    m.includes("npm run")
  ) {
    return "Cloud sync is unavailable. Try again in a moment.";
  }
  if (m.includes("Network error") || m.includes("Failed to fetch")) {
    return "Could not reach the server. Check your connection.";
  }
  if (m.includes("HTTP 404") || m.includes("not found")) {
    return "Account service not found. Hard-refresh the page and try again.";
  }
  if (/HTTP 5\d{2}/.test(m) || m.includes("waking up")) {
    return "Server is waking up — wait a moment and try again.";
  }
  return m;
}
