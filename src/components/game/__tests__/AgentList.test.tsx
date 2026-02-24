import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { AgentList } from '@/components/game/AgentList'

const mockAgents = [
  { id: 'a1', name: 'Sonnet-1', coordinate: { x: 0, y: 10 }, status: 'active' as const },
  { id: 'a2', name: 'Haiku-A',  coordinate: { x: -20, y: 20 }, status: 'idle' as const },
]

it('renders all agents in the list', () => {
  render(<AgentList agents={mockAgents} activeAgentId="a1" onSelect={() => {}} />)
  expect(screen.getByText('Sonnet-1')).toBeInTheDocument()
  expect(screen.getByText('Haiku-A')).toBeInTheDocument()
})

it('calls onSelect with agent id when clicked', () => {
  const onSelect = vi.fn()
  render(<AgentList agents={mockAgents} activeAgentId="a1" onSelect={onSelect} />)
  fireEvent.click(screen.getByText('Haiku-A'))
  expect(onSelect).toHaveBeenCalledWith('a2')
})

it('shows ACTIVE badge for active agent, IDLE for idle', () => {
  render(<AgentList agents={mockAgents} activeAgentId="a1" onSelect={() => {}} />)
  expect(screen.getByText('ACTIVE')).toBeInTheDocument()
  expect(screen.getByText('IDLE')).toBeInTheDocument()
})
