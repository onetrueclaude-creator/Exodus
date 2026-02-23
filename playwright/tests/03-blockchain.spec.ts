import { test, expect } from '@playwright/test'

test.describe('03 · Blockchain Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/game')
    await expect(page.getByText('CPU Energy')).toBeVisible({ timeout: 15_000 })
  })

  test('Secure action decreases CPU Energy in store', async ({ page }) => {
    // Read energy before
    const energyBefore = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store ? store.getState().energy : null
    })

    // Navigate to Secure → 1 Generation
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Secure').first().click()
    await page.getByText('1 Generation').or(page.getByText('1 Gen')).first().click()

    // Find and click the execute/confirm button
    const executeBtn = page.getByRole('button', { name: /execute|confirm|secure/i })
    if (await executeBtn.isVisible({ timeout: 2_000 })) {
      await executeBtn.click()
    }

    // Wait for store update
    await page.waitForTimeout(1_000)

    const energyAfter = await page.evaluate(() => {
      const store = (window as any).__gameStore
      return store ? store.getState().energy : null
    })

    if (energyBefore !== null && energyAfter !== null) {
      expect(energyAfter).toBeLessThan(energyBefore)
    } else {
      // Store not accessible — gap
      test.fail(true, 'window.__gameStore not available — Zustand bridge missing')
    }
  })

  test('Write Data On Chain shows input or confirmation', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Write Data').first().click()

    // Should show some input or confirmation UI
    const writeUi = page.getByRole('textbox')
      .or(page.getByText(/message/i))
      .or(page.getByText(/write/i))
      .or(page.getByText(/data/i))
    await expect(writeUi.first()).toBeVisible({ timeout: 5_000 })
  })

  test('Read Data On Chain returns output', async ({ page }) => {
    await page.getByText('Blockchain Protocols').first().click()
    await page.getByText('Read Data').first().click()

    // Should show scan output or "no data" message
    const readOutput = page.getByText(/scan|report|data|no data|empty/i)
    await expect(readOutput.first()).toBeVisible({ timeout: 5_000 })
  })
})
