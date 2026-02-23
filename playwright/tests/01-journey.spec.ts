import { test, expect } from '@playwright/test'

test.describe('01 · Full User Journey', () => {
  test.use({ storageState: { cookies: [], origins: [] } }) // unauthenticated

  test('landing page has Google auth button', async ({ page }) => {
    await page.goto('/')
    // The landing page should show a sign-in button
    const authBtn = page.getByRole('button', { name: /google/i })
      .or(page.getByRole('link', { name: /google/i }))
      .or(page.getByText(/sign in/i))
    await expect(authBtn.first()).toBeVisible({ timeout: 5_000 })
  })
})

test.describe('01 · Authenticated Journey', () => {
  // Uses default storageState from playwright.config.ts (seeded user)

  test('authenticated user reaches /game', async ({ page }) => {
    await page.goto('/game')
    // Should not redirect to landing
    await expect(page).not.toHaveURL(/\/$/, { timeout: 5_000 })
    await expect(page).toHaveURL('/game', { timeout: 10_000 })
  })

  test('ResourceBar is visible with CPU Energy', async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByText('CPU Energy')).toBeVisible({ timeout: 15_000 })
  })

  test('ResourceBar shows Secured counter', async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByText('Secured')).toBeVisible({ timeout: 15_000 })
  })

  test('TimechainStats panel is visible', async ({ page }) => {
    await page.goto('/game')
    // TimechainStats renders chain status — look for "TESTNET" or "OFFLINE" badge
    const badge = page.getByText('TESTNET').or(page.getByText('OFFLINE'))
    await expect(badge.first()).toBeVisible({ timeout: 15_000 })
  })

  test('game canvas is present', async ({ page }) => {
    await page.goto('/game')
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 15_000 })
  })
})
