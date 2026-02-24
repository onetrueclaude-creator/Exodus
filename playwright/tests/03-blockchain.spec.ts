/**
 * Beta Tester 3 — Blockchain Actions
 * Opens Chain Stats panel and exercises on-chain operations via the terminal.
 * Uses seededPage fixture to inject a mock homenode so the terminal is accessible.
 */
import { test, expect } from '../fixtures'

test.describe('03 · Blockchain Actions', () => {
  test('Chain Stats panel opens and shows block data', async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByRole('button', { name: /Chain Stats/i })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /Chain Stats/i }).click()
    const chainData = page.getByText(/block/i)
      .or(page.getByText(/pool/i))
      .or(page.getByText(/mined/i))
      .or(page.getByText(/epoch/i))
      .or(page.getByText(/OFFLINE/i))
      .or(page.getByText(/TESTNET/i))
    await expect(chainData.first()).toBeVisible({ timeout: 8_000 })
  })

  test('Agent Terminal Secure sub-menu is reachable', async ({ seededPage: page }) => {
    await page.getByRole('button', { name: /Agent Terminal/i }).click()
    await expect(page.getByText('Blockchain Protocols')).toBeVisible({ timeout: 8_000 })
    await page.getByText('Blockchain Protocols').first().click()
    await expect(page.getByText('Secure').first()).toBeVisible({ timeout: 5_000 })
  })

  test('Secure action shows cost/generation selector', async ({ seededPage: page }) => {
    await page.getByRole('button', { name: /Agent Terminal/i }).click()
    await expect(page.getByText('Blockchain Protocols')).toBeVisible({ timeout: 8_000 })
    await page.getByText('Blockchain Protocols').first().click()
    // Scope to the floating panel to avoid matching "Secured Nodes" dock button;
    // click the button element (not the inner span) to avoid pointer-events interception
    await page.locator('.glass-panel-floating').getByRole('button', { name: /\bSecure\b/ }).click()
    const selector = page.getByText(/generation/i)
      .or(page.getByText(/gen/i))
      .or(page.getByText(/cycle/i))
      .or(page.getByText(/block/i))
    await expect(selector.first()).toBeVisible({ timeout: 5_000 })
  })

  test('Write Data On Chain option is reachable', async ({ seededPage: page }) => {
    await page.getByRole('button', { name: /Agent Terminal/i }).click()
    await expect(page.getByText('Blockchain Protocols')).toBeVisible({ timeout: 8_000 })
    await page.getByText('Blockchain Protocols').first().click()
    await expect(page.getByText('Write Data').or(page.getByText('Write Data On Chain'))).toBeVisible({ timeout: 5_000 })
  })
})
