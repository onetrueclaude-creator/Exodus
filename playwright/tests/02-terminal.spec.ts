import { test, expect } from '@playwright/test'

test.describe('02 · Agent Terminal Menu', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game')
    // Wait for game to be ready
    await expect(page.getByText('CPU Energy')).toBeVisible({ timeout: 15_000 })
  })

  test('primary agent terminal is open', async ({ page }) => {
    // AgentChat renders a terminal window — look for the command list
    const terminal = page.locator('[data-testid="agent-chat"]')
      .or(page.getByText('Deploy Agent'))
      .or(page.getByText('Blockchain Protocols'))
    await expect(terminal.first()).toBeVisible({ timeout: 5_000 })
  })

  test('Blockchain Protocols opens sub-menu', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await expect(page.getByText('Secure')).toBeVisible({ timeout: 3_000 })
    await expect(page.getByText('Write Data')).toBeVisible({ timeout: 3_000 })
    await expect(page.getByText('Read Data')).toBeVisible({ timeout: 3_000 })
  })

  test('Secure opens cycle selector', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Secure').first().click()
    // Should show generation options
    await expect(page.getByText('1 Generation').or(page.getByText('1 Gen'))).toBeVisible({ timeout: 3_000 })
  })

  test('Settings opens settings sub-menu', async ({ page }) => {
    await page.getByText('Settings').first().click()
    // Settings should show some option (network color, status report, etc.)
    const settingsContent = page.getByText(/color/i)
      .or(page.getByText(/status/i))
      .or(page.getByText(/settings/i))
    await expect(settingsContent.first()).toBeVisible({ timeout: 3_000 })
  })

  test('Chain Stats shows blockchain data', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Chain Stats').first().click()
    // Should display some chain output
    const output = page.getByText(/block/i).or(page.getByText(/pool/i)).or(page.getByText(/mined/i))
    await expect(output.first()).toBeVisible({ timeout: 5_000 })
  })
})
