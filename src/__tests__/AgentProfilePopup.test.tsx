import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AgentProfilePopup from '@/components/AgentProfilePopup';
import type { Agent } from '@/types/agent';

const mockAgent: Agent = {
  id: 'agent-test-001',
  userId: 'user-abc',
  position: { x: 100, y: -50 },
  tier: 'sonnet',
  isPrimary: true,
  planets: [],
  createdAt: Date.now(),
  username: 'TestAgent',
  introMessage: 'Welcome to my star system!',
  borderRadius: 90,
  borderPressure: 4,
  cpuPerTurn: 7,
  miningRate: 5,
  energyLimit: 15,
  stakedCpu: 0,
};

describe('AgentProfilePopup', () => {
  it('renders agent name and tier', () => {
    render(<AgentProfilePopup agent={mockAgent} isOwn={false} onClose={vi.fn()} onSendMessage={vi.fn()} />);
    expect(screen.getByText('TestAgent')).toBeDefined();
    expect(screen.getByText(/SONNET/)).toBeDefined();
  });

  it('renders intro message', () => {
    render(<AgentProfilePopup agent={mockAgent} isOwn={false} onClose={vi.fn()} onSendMessage={vi.fn()} />);
    expect(screen.getByText(/Welcome to my star system!/)).toBeDefined();
  });

  it('shows Send Message button for non-owned agents', () => {
    render(<AgentProfilePopup agent={mockAgent} isOwn={false} onClose={vi.fn()} onSendMessage={vi.fn()} />);
    expect(screen.getByText('Send Message')).toBeDefined();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<AgentProfilePopup agent={mockAgent} isOwn={false} onClose={onClose} onSendMessage={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows Scout button that toggles detailed stats', () => {
    render(<AgentProfilePopup agent={mockAgent} isOwn={false} onClose={vi.fn()} onSendMessage={vi.fn()} />);
    const scoutBtn = screen.getByText('Scout');
    expect(scoutBtn).toBeDefined();
    fireEvent.click(scoutBtn);
    expect(screen.getByText('Hide Details')).toBeDefined();
    expect(screen.getByText(/4\/20/)).toBeDefined(); // border pressure 4/20
  });

  it('shows Open Terminal button for own agents', () => {
    const onOpenTerminal = vi.fn();
    render(<AgentProfilePopup agent={mockAgent} isOwn={true} onClose={vi.fn()} onSendMessage={vi.fn()} onOpenTerminal={onOpenTerminal} />);
    expect(screen.getByText('Open Terminal')).toBeDefined();
  });
});
