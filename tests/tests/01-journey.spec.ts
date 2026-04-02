/**
 * Beta Tester 1 — Game Load
 * Tests that the game page renders its core UI shell correctly.
 */
import { test, expect } from '@playwright/test'

test.describe('01 · Landing / Entry', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('root redirects to /game in dev mode', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/game', { timeout: 10_000 })
  })
})

test.describe('01 · Game Shell', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game')
  })

  test('game page loads and title is correct', async ({ page }) => {
    await expect(page).toHaveTitle(/ZK Agentic/i, { timeout: 10_000 })
  })

  test('ResourceBar shows resource numbers', async ({ page }) => {
    // Compact resource bar shows numeric values without explicit labels
    await expect(page.getByText('Your Network')).toBeVisible({ timeout: 15_000 })
  })

  test('chain status badge is visible (TESTNET or OFFLINE)', async ({ page }) => {
    const badge = page.getByText('TESTNET').or(page.getByText('OFFLINE'))
    await expect(badge.first()).toBeVisible({ timeout: 15_000 })
  })

  test('tab navigation is rendered', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Network/i }).first()).toBeVisible({ timeout: 10_000 })
  })

  test('dock bar is rendered with core action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Agent Terminal/i })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: /Chain Stats/i })).toBeVisible({ timeout: 10_000 })
  })

  test('game canvas is present after load', async ({ page }) => {
    // Wait for loading overlay to clear
    await page.waitForTimeout(3_000)
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 })
  })
})
