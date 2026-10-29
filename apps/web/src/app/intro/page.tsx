"use client";

import dynamic from "next/dynamic";

const CinematicJCBIntro = dynamic(
  () => import("../../components/CinematicJCBIntro").then((mod) => mod.CinematicJCBIntro),
  { ssr: false }
);

export default function IntroPage() {
  return <CinematicJCBIntro />;
}

