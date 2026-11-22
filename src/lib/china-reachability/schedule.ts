import { startChinaReachability } from "@/lib/china-reachability/run";

const DAY_MS = 24 * 60 * 60 * 1000;
const START_DELAY_MS = 90 * 1000;

let started = false;

export function startChinaReachabilitySchedule() {
  if (started) {
    return;
  }
  started = true;
  setTimeout(() => {
    void startChinaReachability();
  }, START_DELAY_MS);
  setInterval(() => {
    void startChinaReachability();
  }, DAY_MS);
  console.info("china_reachability_schedule_started");
}
