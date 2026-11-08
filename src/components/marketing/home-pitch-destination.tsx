import { EsimCompare } from "@/components/marketing/esim-compare";
import { HOME_PITCH_IDS } from "@/components/marketing/home-pitch-target";
import { NetworkCompare } from "@/components/marketing/network-compare";

export function HomePitchDestination() {
  return (
    <>
      <section
        id={HOME_PITCH_IDS.esim}
        data-home-page
        className="h-dvh snap-center snap-always overflow-hidden bg-[#10141a] max-md:snap-start"
      >
        <EsimCompare />
      </section>
      <section
        id={HOME_PITCH_IDS.network}
        data-home-page
        className="h-dvh snap-center snap-always overflow-hidden bg-[#14181e] max-md:snap-start"
      >
        <NetworkCompare />
      </section>
    </>
  );
}
