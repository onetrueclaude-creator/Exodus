'use client'
import React from 'react'

interface Agent {
  id: string
  name: string
  coordinate: { x: number; y: number }
  status: 'active' | 'idle'
}

interface Props {
  agents: Agent[]
  activeAgentId: string | null
  onSelect: (id: string) => void
}

export function AgentList({ agents, activeAgentId, onSelect }: Props) {
  return (
    <div className="agent-list flex flex-col gap-1 p-2">
      {agents.map(agent => (
        <div
          key={agent.id}
          className={`agent-list-item flex items-center justify-between p-2 rounded cursor-pointer border transition-colors
            ${agent.id === activeAgentId
              ? 'border-cyan-500 bg-cyan-900/20'
              : 'border-gray-700 bg-black/20 hover:border-gray-500'
            }`}
          onClick={() => onSelect(agent.id)}
        >
          <div className="flex flex-col">
            <span className="agent-name text-sm font-mono text-cyan-300">{agent.name}</span>
            <span className="agent-coord text-xs text-gray-500">
              ({agent.coordinate.x},{agent.coordinate.y})
            </span>
          </div>
          <span className={`agent-status text-xs font-bold px-1 py-0.5 rounded
            ${agent.status === 'active' ? 'text-green-400 bg-green-900/30' : 'text-gray-400 bg-gray-800/30'}`}>
            {agent.status.toUpperCase()}
          </span>
        </div>
      ))}
    </div>
  )
}
