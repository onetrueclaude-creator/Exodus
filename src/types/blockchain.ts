/**
 * The 6 restricted actions permitted during blockchain operations.
 * No creative prompting or free-form operations allowed — all chain
 * interactions must go through one of these forced pipelines.
 */
export type BlockchainAction = 'read' | 'edit' | 'store' | 'verify' | 'vote' | 'secure';

export interface ChainOperation {
  action: BlockchainAction;
  targetCoordinate: { x: number; y: number };
  userId: string;
  timestamp: number;
  payload?: unknown;
}

export interface OperationResult {
  success: boolean;
  action: BlockchainAction;
  error?: string;
}

/**
 * Validates that a chain operation is permitted.
 * - Edit operations can only target coordinates owned by the user
 * - All operations must use one of the 6 permitted actions
 */
export function validateChainOperation(
  operation: ChainOperation,
  ownedCoordinates: Array<{ x: number; y: number }>,
): OperationResult {
  const validActions: BlockchainAction[] = ['read', 'edit', 'store', 'verify', 'vote', 'secure'];

  if (!validActions.includes(operation.action)) {
    return { success: false, action: operation.action, error: 'Invalid action' };
  }

  // Edit, Store, and Secure operations can only target owned coordinates
  if (operation.action === 'edit' || operation.action === 'store' || operation.action === 'secure') {
    const isOwned = ownedCoordinates.some(
      (c) => c.x === operation.targetCoordinate.x && c.y === operation.targetCoordinate.y,
    );
    if (!isOwned) {
      return {
        success: false,
        action: operation.action,
        error: `Cannot ${operation.action} at unowned coordinate (${operation.targetCoordinate.x}, ${operation.targetCoordinate.y})`,
      };
    }
  }

  return { success: true, action: operation.action };
}
