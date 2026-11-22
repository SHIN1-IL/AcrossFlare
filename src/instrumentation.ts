export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  if (process.env.CHINA_REACHABILITY_ENABLED === "0") {
    return;
  }
  if (process.env.NODE_ENV !== "production") {
    return;
  }
  const { startChinaReachabilitySchedule } = await import("@/lib/china-reachability/schedule");
  startChinaReachabilitySchedule();
}
