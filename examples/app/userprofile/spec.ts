import { test, expect } from '@playwright/test'

test('UserProfile example renders and copies code', async ({ page }) => {
  // Adjust the route as needed in your app; here we assume /examples/app/<component>/
  await page.goto('/examples/app/userprofile/')
  await expect(page.getByRole('heading', { name: 'UserProfile — MVP Example' })).toBeVisible()
  const btn = page.getByRole('button', { name: 'Copy code' })
  await expect(btn).toBeVisible()
  await btn.click()
  await expect(page.getByRole('button', { name: 'Copied ✓' })).toBeVisible()
})
