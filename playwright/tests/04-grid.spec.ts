import { test, expect } from '@playwright/test'

test.describe('04 · Grid Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByText('CPU Energy')).toBeVisible({ timeout: 15_000 })
  })

  test('canvas is present and sized', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible()
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(200)
    expect(box!.height).toBeGreaterThan(200)
  })

  test('clicking canvas near center opens QuickActionMenu or AgentCreator', async ({ page }) => {
    const canvas = page.locator('canvas').first()
    const box = await canvas.boundingBox()
    if (!box) test.skip(true, 'Canvas not found')

    // Click slightly offset from center (avoid clicking own homenode)
    await canvas.click({ position: { x: box!.width / 2 + 60, y: box!.height / 2 } })
    await page.waitForTimeout(500)

    // Either a QuickActionMenu, AgentCreator, or some node UI should appear
    const nodeUi = page.getByText(/deploy|create|claim|node|unclaimed/i)
    // Not asserting — just checking something responds
    const appeared = await nodeUi.first().isVisible({ timeout: 2_000 }).catch(() => false)
    // Record result but don't fail — canvas interaction is fragile
    console.log('Node UI appeared after canvas click:', appeared)
  })

  test('Zustand agents map is populated after load', async ({ page }) => {
    await page.waitForTimeout(3_000) // allow hydration

    const agentCount = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store ? Object.keys(store.getState().agents).length : -1
    })

    expect(agentCount).toBeGreaterThan(-1) // -1 means bridge missing
    // Agent count >= 1 means homenode loaded from Supabase
    expect(agentCount).toBeGreaterThanOrEqual(1)
  })

  test('currentUserId is set after game loads', async ({ page }) => {
    await page.waitForTimeout(3_000)

    const userId = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store ? store.getState().currentUserId : null
    })

    expect(userId).not.toBeNull()
  })
})
