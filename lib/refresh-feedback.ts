export function refreshFeedback(status: string, cached = false) {
  if (cached) return { outcome: status === "RUNNING" ? "running" : "cached", message: status === "RUNNING"
    ? "Your refresh is already in progress. Please check again shortly."
    : "Showing your saved data. A new refresh is not available yet." };
  if (status === "UNAVAILABLE" || status === "FAILED") return {
    outcome: "failed", error: "We could not update your metrics. Your saved data is still available. Check your account connection and try again.",
    message: "Your metrics were not updated.",
  };
  if (status === "PARTIAL") return { outcome: "partial", message: "We updated the data available from this account. Some insights are currently unavailable." };
  if (status === "EMPTY") return { outcome: "empty", message: "Refresh completed. No recent posts were returned for this account." };
  return { outcome: "updated", message: "Your metrics have been updated." };
}
