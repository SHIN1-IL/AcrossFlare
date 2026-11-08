export const HOME_PITCH_IDS = {
  esim: "home-pitch-esim",
  network: "home-pitch-network",
} as const;

export type HomePitchTarget = keyof typeof HOME_PITCH_IDS;

export function openHomePitch(next: HomePitchTarget) {
  requestAnimationFrame(() => {
    document.getElementById(HOME_PITCH_IDS[next])?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  });
}
