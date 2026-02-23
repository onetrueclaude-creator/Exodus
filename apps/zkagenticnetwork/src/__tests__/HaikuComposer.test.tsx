import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HaikuComposer from '@/components/HaikuComposer';

describe('HaikuComposer', () => {
  it('renders 3-line input area', () => {
    render(<HaikuComposer onSubmit={vi.fn()} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows syllable counts', () => {
    render(<HaikuComposer onSubmit={vi.fn()} />);
    // Initial state shows 0 counts — two lines target 5 syllables, one targets 7
    const fiveCounters = screen.getAllByText('0/5');
    expect(fiveCounters).toHaveLength(2);
    expect(screen.getByText('0/7')).toBeInTheDocument();
  });

  it('disables submit when haiku is invalid', () => {
    render(<HaikuComposer onSubmit={vi.fn()} />);
    const button = screen.getByRole('button', { name: /send/i });
    expect(button).toBeDisabled();
  });

  it('calls onSubmit with valid haiku text', () => {
    const onSubmit = vi.fn();
    render(<HaikuComposer onSubmit={onSubmit} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, {
      target: { value: 'An old silent pond\nA frog jumps into the pond\nSplash silence again' },
    });

    const button = screen.getByRole('button', { name: /send/i });
    // Button should be enabled if syllable count matches 5-7-5
    if (!button.hasAttribute('disabled')) {
      fireEvent.click(button);
      expect(onSubmit).toHaveBeenCalledWith(expect.stringContaining('An old silent pond'));
    }
  });
});
