/**
 * Beta Tester 2 — Agent Terminal
 * Opens the Agent Terminal dock panel and exercises the command menu tree.
 * Uses seededPage fixture to inject a mock homenode so the terminal is accessible.
 */
import { test, expect } from '../fixtures'

test.describe('02 · Agent Terminal', () => {
  test.beforeEach(async ({ seededPage: page }) => {
    // Open the Agent Terminal from the dock
    const terminalBtn = page.getByRole('button', { name: /Agent Terminal/i })
    await expect(terminalBtn).toBeVisible({ timeout: 10_000 })
    await terminalBtn.click()
  })

  test('agent terminal panel opens with command menu', async ({ seededPage: page }) => {
    const terminal = page.getByText('Deploy Agent')
      .or(page.getByText('Blockchain Protocols'))
      .or(page.getByRole('button', { name: /Deploy/i }))
    await expect(terminal.first()).toBeVisible({ timeout: 8_000 })
  })

  test('Blockchain Protocols command is present', async ({ seededPage: page }) => {
    // Use a single locator to avoid strict-mode violation from button + inner span both matching
    await expect(page.getByText('Blockchain Protocols').first()).toBeVisible({ timeout: 8_000 })
  })

  test('clicking Blockchain Protocols reveals sub-commands', async ({ seededPage: page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    const subCmd = page.getByText('Secure').or(page.getByText('Write Data')).or(page.getByText('Read Data'))
    await expect(subCmd.first()).toBeVisible({ timeout: 5_000 })
  })

  test('Settings command is accessible', async ({ seededPage: page }) => {
    const settings = page.getByText('Settings').or(page.getByRole('button', { name: /Settings/i }))
    await expect(settings.first()).toBeVisible({ timeout: 8_000 })
  })
})
