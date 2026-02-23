import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '@/store';

describe('activeDockPanel store field', () => {
  beforeEach(() => {
    useGameStore.getState().reset();
  });

  it('starts as null', () => {
    expect(useGameStore.getState().activeDockPanel).toBe(null);
  });

  it('sets a panel', () => {
    useGameStore.getState().setActiveDockPanel('chat');
    expect(useGameStore.getState().activeDockPanel).toBe('chat');
  });

  it('toggles off when set to same value', () => {
    useGameStore.getState().setActiveDockPanel('terminal');
    useGameStore.getState().setActiveDockPanel('terminal');
    expect(useGameStore.getState().activeDockPanel).toBe(null);
  });

  it('switches between panels', () => {
    useGameStore.getState().setActiveDockPanel('chat');
    useGameStore.getState().setActiveDockPanel('stats');
    expect(useGameStore.getState().activeDockPanel).toBe('stats');
  });

  it('sets to null explicitly', () => {
    useGameStore.getState().setActiveDockPanel('chat');
    useGameStore.getState().setActiveDockPanel(null);
    expect(useGameStore.getState().activeDockPanel).toBe(null);
  });
});
