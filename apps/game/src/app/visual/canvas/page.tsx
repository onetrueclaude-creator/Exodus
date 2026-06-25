"use client";

import { useEffect, useState } from "react";
import OrbitalCanvas from "@/components/OrbitalCanvas";
import { useGameStore } from "@/store";
import { buildVisualFixture } from "@/lib/visualTest";

export default function VisualCanvasPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const { reset, addAgent, setCurrentUser } = useGameStore.getState();
    reset();
    const fixture = buildVisualFixture();
    for (const agent of fixture) addAgent(agent);
    const self = fixture.find((a) => a.isSelf);
    if (self?.userId) setCurrentUser(self.userId, self.id);
    setReady(true);
  }, []);

  return (
    <div style={{ width: "1280px", height: "720px", position: "relative" }}>
      {ready && <OrbitalCanvas visualTest />}
    </div>
  );
}
