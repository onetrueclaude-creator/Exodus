"use client";

import { useEffect, useState } from 'react';
import GalaxyGrid from '@/components/GalaxyGrid';
import HaikuComposer from '@/components/HaikuComposer';
import AgentPanel from '@/components/AgentPanel';
import ResourceBar from '@/components/ResourceBar';
import TabNavigation from '@/components/TabNavigation';
import AccountView from '@/components/AccountView';
import ResearchPanel from '@/components/ResearchPanel';
import SkillsPanel from '@/components/SkillsPanel';
import PlanetCreator from '@/components/PlanetCreator';
import { useGameStore } from '@/store';
import { MockChainService } from '@/services/chainService';

const chainService = new MockChainService();

export default function GamePage() {
  const addAgent = useGameStore((s) => s.addAgent);
  const addHaiku = useGameStore((s) => s.addHaiku);
  const setCurrentUser = useGameStore((s) => s.setCurrentUser);
  const currentAgentId = useGameStore((s) => s.currentAgentId);
  const activeTab = useGameStore((s) => s.activeTab);

  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showPlanetCreator, setShowPlanetCreator] = useState(false);

  useEffect(() => {
    async function init() {
      const agents = await chainService.getAgents();
      agents.forEach(addAgent);

      const feed = await chainService.getHaikuFeed();
      feed.forEach(addHaiku);

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
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-background">
      {/* Resource bar — always visible at top */}
      <ResourceBar />

      {/* Tab navigation */}
      <TabNavigation />

      {/* Tab content area — fills remaining space */}
      <div className="flex-1 relative overflow-hidden">
        {/* Network tab */}
        {activeTab === 'network' && (
          <div className="absolute inset-0">
            <GalaxyGrid />

            {/* Haiku composer — bottom right */}
            <div className="absolute bottom-4 right-4 z-10">
              <HaikuComposer onSubmit={handleHaikuSubmit} />
            </div>

            {/* Planet creator button — bottom left */}
            <div className="absolute bottom-4 left-4 z-10">
              {showPlanetCreator && currentAgentId ? (
                <PlanetCreator
                  agentId={currentAgentId}
                  onSubmit={(planetData) => {
                    useGameStore.getState().addPlanet({
                      ...planetData,
                      id: `planet-${Date.now()}`,
                      createdAt: Date.now(),
                    });
                  }}
                  onClose={() => setShowPlanetCreator(false)}
                />
              ) : (
                <button
                  onClick={() => setShowPlanetCreator(true)}
                  className="glass-card px-4 py-2 text-xs font-semibold text-accent-purple hover:text-text-primary transition-all"
                >
                  + Planet
                </button>
              )}
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
        )}

        {/* Account View tab */}
        {activeTab === 'account' && <AccountView />}

        {/* Researches tab */}
        {activeTab === 'researches' && (
          <ResearchPanel
            energy={useGameStore.getState().energy}
            progress={{}}
            completedIds={[]}
            onAllocateEnergy={(id, amount) => {
              // TODO: Wire up research energy allocation
            }}
          />
        )}

        {/* Skills tab */}
        {activeTab === 'skills' && <SkillsPanel />}
      </div>
    </div>
  );
}
