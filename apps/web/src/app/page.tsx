"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

const CinematicJCBIntro = dynamic(
  () => import("../components/CinematicJCBIntro").then((mod) => mod.CinematicJCBIntro),
  { ssr: false }
);

export default function HomePage() {
  const router = useRouter();
  const { session } = useAuth();

  const handleComplete = () => {
    if (session) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  return <CinematicJCBIntro onComplete={handleComplete} />;
}
