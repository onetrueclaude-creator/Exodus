import { describe, it, expect } from 'vitest';
import { validateChainOperation } from '@/types/blockchain';
import type { ChainOperation } from '@/types/blockchain';

describe('validateChainOperation', () => {
  const ownedCoords = [{ x: 100, y: 200 }, { x: 101, y: 200 }];

  it('allows read on any coordinate', () => {
    const op: ChainOperation = {
      action: 'read',
      targetCoordinate: { x: 999, y: 999 },
      userId: 'user-1',
      timestamp: Date.now(),
    };
    expect(validateChainOperation(op, ownedCoords).success).toBe(true);
  });

  it('allows edit on owned coordinate', () => {
    const op: ChainOperation = {
      action: 'edit',
      targetCoordinate: { x: 100, y: 200 },
      userId: 'user-1',
      timestamp: Date.now(),
    };
    expect(validateChainOperation(op, ownedCoords).success).toBe(true);
  });

  it('blocks edit on unowned coordinate', () => {
    const op: ChainOperation = {
      action: 'edit',
      targetCoordinate: { x: 500, y: 500 },
      userId: 'user-1',
      timestamp: Date.now(),
    };
    const result = validateChainOperation(op, ownedCoords);
    expect(result.success).toBe(false);
    expect(result.error).toContain('unowned coordinate');
  });

  it('blocks store on unowned coordinate', () => {
    const op: ChainOperation = {
      action: 'store',
      targetCoordinate: { x: 500, y: 500 },
      userId: 'user-1',
      timestamp: Date.now(),
    };
    expect(validateChainOperation(op, ownedCoords).success).toBe(false);
  });

  it('allows verify on any coordinate', () => {
    const op: ChainOperation = {
      action: 'verify',
      targetCoordinate: { x: 999, y: 999 },
      userId: 'user-1',
      timestamp: Date.now(),
    };
    expect(validateChainOperation(op, ownedCoords).success).toBe(true);
  });

  it('allows vote on any coordinate', () => {
    const op: ChainOperation = {
      action: 'vote',
      targetCoordinate: { x: 999, y: 999 },
      userId: 'user-1',
      timestamp: Date.now(),
    };
    expect(validateChainOperation(op, ownedCoords).success).toBe(true);
  });

  it('blocks secure on unowned coordinate', () => {
    const op: ChainOperation = {
      action: 'secure',
      targetCoordinate: { x: 500, y: 500 },
      userId: 'user-1',
      timestamp: Date.now(),
    };
    expect(validateChainOperation(op, ownedCoords).success).toBe(false);
  });

  it('allows secure on owned coordinate', () => {
    const op: ChainOperation = {
      action: 'secure',
      targetCoordinate: { x: 100, y: 200 },
      userId: 'user-1',
      timestamp: Date.now(),
    };
    expect(validateChainOperation(op, ownedCoords).success).toBe(true);
  });
});
