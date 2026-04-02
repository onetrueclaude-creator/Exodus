/**
 * Beta Tester 4 — Grid & Map Interaction
 * Verifies the PixiJS galaxy canvas renders and responds to interaction.
 */
import { test, expect, MOCK_AGENT_ID } from '../fixtures'

test.describe('04 · Grid Interaction', () => {
  test('canvas is present and sized', async ({ page }) => {
    await page.goto('/game')
    await page.waitForTimeout(4_000)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThan(200)
    expect(box!.height).toBeGreaterThan(200)
  })

  test('clicking canvas near center does not crash the page', async ({ page }) => {
    await page.goto('/game')
    await page.waitForTimeout(4_000)
    const canvas = page.locator('canvas').first()
    await expect(canvas).toBeVisible({ timeout: 15_000 })
    const box = await canvas.boundingBox()
    if (!box) test.skip(true, 'Canvas not found')
    await canvas.click({ position: { x: box!.width / 2 + 60, y: box!.height / 2 } })
    await page.waitForTimeout(500)
    await expect(page).toHaveURL('/game')
  })

  test('Deploy Agent dock button is present', async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByRole('button', { name: /Deploy Agent/i })).toBeVisible({ timeout: 10_000 })
  })

  test('Secured Nodes dock button is present', async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByRole('button', { name: /Secured Nodes/i })).toBeVisible({ timeout: 10_000 })
  })

  test('window.__gameStore is exposed in dev mode', async ({ seededPage: page }) => {
    const hasStore = await page.evaluate(() => typeof (window as any).__gameStore === 'function')
    if (!hasStore) console.warn('GAP: window.__gameStore not available — Zustand bridge missing')
    expect(hasStore).toBe(true)
  })

  test('seeded homenode appears in Zustand agents map', async ({ seededPage: page }) => {
    const agentIds = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store ? Object.keys(store.getState().agents) : []
    })
    expect(agentIds.length).toBeGreaterThanOrEqual(1)
    expect(agentIds).toContain(MOCK_AGENT_ID)
  })

  test('selectedAgentId matches seeded homenode', async ({ seededPage: page }) => {
    const selectedId = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store?.getState().selectedAgentId ?? null
    })
    expect(selectedId).toBe(MOCK_AGENT_ID)
  })
})
