/**
 * Shared Playwright fixtures for ZK Agentic Network beta testers.
 *
 * Provides a `seededPage` fixture that:
 * 1. Navigates to /game
 * 2. Waits for the Zustand store bridge to be available
 * 3. Seeds a mock homenode so the Agent Terminal and other UI are accessible
 *    without a real Supabase session.
 */
import { test as base, expect, type Page } from '@playwright/test'

const MOCK_USER_ID = 'dev-tester-001'
const MOCK_AGENT_ID = `${MOCK_USER_ID}-homenode`

async function seedGameStore(page: Page) {
  // Wait for the store bridge AND for init() to finish (isInitializing = false).
  // init() now calls syncFromChain() which races with store injection; waiting
  // for init to complete prevents firstOwned from picking up the fixture agent.
  await page.waitForFunction(() => {
    const store = (window as any).__gameStore
    if (typeof store !== 'function') return false
    return !store.getState().isInitializing
  }, { timeout: 20_000 })

  await page.evaluate(
    async ({ userId, agentId }) => {
      const store = (window as any).__gameStore
      if (!store) return

      const mockAgent = {
        id: agentId,
        userId,
        position: { x: 0, y: 0 },
        tier: 'sonnet' as const,
        isPrimary: true,
        planets: [],
        createdAt: Date.now(),
        username: 'beta_tester',
        bio: undefined,
        introMessage: 'Beta tester node',
        borderRadius: 30,
        borderPressure: 0,
        cpuPerTurn: 10,
        miningRate: 1,
        energyLimit: 2000,
        stakedCpu: 5,
        parentAgentId: undefined,
        density: 0.5,
        storageSlots: 10,
      }

      store.setState({
        agents: { [agentId]: mockAgent },
        currentUserId: userId,
        primaryAgentId: agentId,
        currentAgentId: agentId,  // DockPanel reads currentAgentId to pass as prop
        selectedAgentId: agentId,
      })
    },
    { userId: MOCK_USER_ID, agentId: MOCK_AGENT_ID },
  )
  // Allow React to re-render with the seeded state before tests interact
  await page.waitForTimeout(500)
}

export const test = base.extend<{ seededPage: Page }>({
  seededPage: async ({ page }, use) => {
    await page.goto('/game')
    await seedGameStore(page)
    await use(page)
  },
})

export { expect }
export { MOCK_USER_ID, MOCK_AGENT_ID }
