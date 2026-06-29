"use client";

import { useRef, useEffect } from "react";
import OrbitalCanvas from "@/components/OrbitalCanvas";
import { useGameStore } from "@/store";
import { buildVisualFixture } from "@/lib/visualTest";

export default function VisualCanvasPage() {
  const initialized = useRef(false);
  // Store-derived gate (no setState-in-effect): OrbitalCanvas mounts ONLY after the
  // fixture has been seeded, so its init reads the full deterministic scene rather
  // than racing an empty store. The selector flips true once addAgent has run.
  const seeded = useGameStore((s) => Object.keys(s.agents).length > 0);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const { reset, addAgent, setCurrentUser } = useGameStore.getState();
    reset();
    const fixture = buildVisualFixture();
    for (const agent of fixture) addAgent(agent);
    const self = fixture.find((a) => a.isSelf);
    if (self?.userId) setCurrentUser(self.userId, self.id);
  }, []);

  return (
    <div style={{ width: "1280px", height: "720px", position: "relative" }}>
      {seeded && <OrbitalCanvas visualTest />}
    </div>
  );
}
