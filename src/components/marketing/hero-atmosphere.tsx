"use client";

import { useEffect, useState } from "react";

const CODE = `connect({
  region: "sg-edge",
  protocol: "vless",
  transport: "grpc"
})

const backup = await openVault({
  space: "acrossflare",
  sync: true
})

route("/subscribe", async (req) => {
  const token = sign(req.user.id)
  return yaml({ token, backup })
})

if (traffic.exhausted) {
  failover.to("racknerd")
}

rotate({
  lock: mutex,
  endpoint: "socks5"
})

export function provision(plan) {
  return Promise.all([
    issueClient(plan),
    inviteVault(plan),
    prepareSync(plan)
  ])
}

const peer = {
  publicKey: env.WG_KEY,
  allowedIPs: ["0.0.0.0/0"]
}

watch(health, (node) => {
  if (node.status !== "online") {
    reroute(node.id)
  }
})
`;

type Meteor = {
  id: number;
  left: number;
  top: number;
  angle: number;
  length: number;
};

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function HeroAtmosphere() {
  const [meteors, setMeteors] = useState<Meteor[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let timeoutId = 0;
    let nextId = 1;
    let active = true;

    const spawn = () => {
      if (!active || document.hidden) {
        return;
      }

      const meteor: Meteor = {
        id: nextId,
        left: randomBetween(8, 92),
        top: randomBetween(-4, 28),
        angle: randomBetween(-52, -38),
        length: randomBetween(70, 140),
      };
      nextId += 1;
      setMeteors((current) => [...current.slice(-4), meteor]);
    };

    const schedule = () => {
      timeoutId = window.setTimeout(() => {
        spawn();
        schedule();
      }, randomBetween(1800, 4200));
    };

    spawn();
    schedule();

    const onVisibility = () => {
      if (document.hidden) {
        window.clearTimeout(timeoutId);
        setMeteors([]);
      } else if (active) {
        spawn();
        schedule();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const stream = `${CODE}\n${CODE}`;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-y-0 left-0 hidden w-[min(16vw,10.5rem)] pl-3 text-left [mask-image:linear-gradient(to_right,black_55%,transparent)] sm:block">
        <pre className="animate-code-flow font-mono text-[10px] leading-4 text-primary/22 whitespace-pre">
          {stream}
        </pre>
      </div>
      <div className="absolute inset-y-0 right-0 hidden w-[min(16vw,10.5rem)] pr-3 text-right [mask-image:linear-gradient(to_left,black_55%,transparent)] sm:block">
        <pre className="animate-code-flow-slow font-mono text-[10px] leading-4 text-primary/18 whitespace-pre">
          {stream}
        </pre>
      </div>
      {meteors.map((meteor) => (
        <span
          key={meteor.id}
          className="animate-meteor-fall absolute w-[1.5px] origin-top"
          style={{
            left: `${meteor.left}%`,
            top: `${meteor.top}%`,
            height: meteor.length,
            ["--angle" as string]: `${meteor.angle}deg`,
            background:
              "linear-gradient(to bottom, transparent 0%, rgb(16 185 129 / 0.28) 35%, #f5f5f5 100%)",
          }}
        />
      ))}
    </div>
  );
}
