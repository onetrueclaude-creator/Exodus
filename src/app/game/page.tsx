"use client";

import { useEffect, useState } from 'react';
import GalaxyGrid from '@/components/GalaxyGrid';
import HaikuComposer from '@/components/HaikuComposer';
import AgentPanel from '@/components/AgentPanel';
import GameHUD from '@/components/GameHUD';
import { useGameStore } from '@/store';
import { MockChainService } from '@/services/chainService';

const chainService = new MockChainService();

export default function GamePage() {
  const addAgent = useGameStore((s) => s.addAgent);
  const addHaiku = useGameStore((s) => s.addHaiku);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const currentAgentId = useGameStore((s) => s.currentAgentId);

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  // Initialize game with mock data
  useEffect(() => {
    async function init() {
      const agents = await chainService.getAgents();
      agents.forEach(addAgent);

      const feed = await chainService.getHaikuFeed();
      feed.forEach(addHaiku);

      // Set first agent as current user for demo
      if (agents.length > 0) {
        setCurrentUser(agents[0].userId, agents[0].id);
      }
    }
    init();
  }, []);

  const handleHaikuSubmit = async (text: string) => {
    if (!currentAgentId) return;
    const haiku = await chainService.postHaiku(currentAgentId, text);
    addHaiku(haiku);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-background">
      {/* Galaxy canvas — full viewport */}
      <GalaxyGrid />

      {/* HUD — top left */}
      <div className="absolute top-4 left-4 z-10">
        <GameHUD />
      </div>

      {/* Haiku composer — bottom right */}
      <div className="absolute bottom-4 right-4 z-10">
        <HaikuComposer onSubmit={handleHaikuSubmit} />
      </div>

      {/* Agent panel — right side (when selected) */}
      {selectedAgent && (
        <div className="absolute top-4 right-4 z-20">
          <AgentPanel
            agent={useGameStore.getState().agents[selectedAgent]}
            fogLevel="clear"
            clarityLevel={0}
            onClose={() => setSelectedAgent(null)}
          />
        </div>
      )}
    </div>
  );
}
