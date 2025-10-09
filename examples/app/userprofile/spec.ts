import { test, expect } from '@playwright/test'

test('UserProfile example renders and copies code', async ({ page }) => {
  // Adjust the route as needed in your app; here we assume /examples/app/<component>/
  await page.goto('/examples/app/userprofile/')
  await expect(page.getByRole('heading', { name: 'UserProfile' })).toBeVisible()
  const btn = page.getByRole('button', { name: 'Copy Code' })
  await expect(btn).toBeVisible()
  await btn.click()
  await expect(page.getByRole('button', { name: 'Copied!' })).toBeVisible()
})

test('UserProfile configuration controls work', async ({ page }) => {
  await page.goto('/examples/app/userprofile/')
  
  // Check that configuration section is visible
  await expect(page.getByRole('heading', { name: 'Profile Configuration' })).toBeVisible()
  
  // Test pubkey input
  const pubkeyInput = page.getByLabel('Public Key (npub)')
  await expect(pubkeyInput).toBeVisible()
  await pubkeyInput.fill('npub1test1234567890abcdef1234567890abcdef1234567890abcdef1234567890')
  
  // Test display mode selector
  const displayModeSelect = page.getByLabel('Display Mode')
  await expect(displayModeSelect).toBeVisible()
  await displayModeSelect.click()
  await page.getByRole('option', { name: 'Compact' }).click()
  
  // Test checkboxes
  const editCheckbox = page.getByLabel('Edit Button')
  await expect(editCheckbox).toBeVisible()
  await editCheckbox.uncheck()
  await editCheckbox.check()
  
  // Test live mode buttons
  const liveButton = page.getByRole('button', { name: 'Live' })
  const staticButton = page.getByRole('button', { name: 'Static' })
  await expect(liveButton).toBeVisible()
  await expect(staticButton).toBeVisible()
  await staticButton.click()
  await expect(staticButton).toHaveClass(/.*bg-.*/) // Should be selected
  
  // Test relay management
  const addRelayButton = page.getByRole('button').filter({ hasText: '+' }).first()
  await expect(addRelayButton).toBeVisible()
  await addRelayButton.click()
  
  // Check that a new relay was added
  const relayBadges = page.getByText('new.relay.example.com')
  await expect(relayBadges).toBeVisible()
})

test('UserProfile renders with different display modes', async ({ page }) => {
  await page.goto('/examples/app/userprofile/')
  
  // Wait for initial load
  await page.waitForTimeout(2000)
  
  // Test full mode
  const fullProfile = page.locator('.space-y-6').first()
  await expect(fullProfile).toBeVisible()
  
  // Switch to compact mode
  const displayModeSelect = page.getByLabel('Display Mode')
  await displayModeSelect.click()
  await page.getByRole('option', { name: 'Compact' }).click()
  
  // Check that compact mode is active
  const compactProfile = page.locator('div').filter({ hasText: /Anonymous/ }).first()
  await expect(compactProfile).toBeVisible()
})

test('UserProfile tabs and examples work', async ({ page }) => {
  await page.goto('/examples/app/userprofile/')
  
  // Check that tabs are visible
  const tabsList = page.getByRole('tablist')
  await expect(tabsList).toBeVisible()
  
  // Test Basic tab
  const basicTab = page.getByRole('tab', { name: 'Basic' })
  await expect(basicTab).toBeVisible()
  await basicTab.click()
  await expect(page.getByRole('heading', { name: 'Development (Examples)' })).toBeVisible()
  
  // Test Framework tab
  const frameworkTab = page.getByRole('tab', { name: 'Framework' })
  await expect(frameworkTab).toBeVisible()
  await frameworkTab.click()
  await expect(page.getByRole('heading', { name: 'Production (npm)' })).toBeVisible()
  
  // Test Advanced tab
  const advancedTab = page.getByRole('tab', { name: 'Advanced' })
  await expect(advancedTab).toBeVisible()
  await advancedTab.click()
  await expect(page.getByRole('heading', { name: 'Advanced Features' })).toBeVisible()
})

test('UserProfile features section displays correctly', async ({ page }) => {
  await page.goto('/examples/app/userprofile/')
  
  // Scroll to features section
  await page.getByRole('heading', { name: 'Features' }).scrollIntoViewIfNeeded()
  await expect(page.getByRole('heading', { name: 'Features' })).toBeVisible()
  
  // Check that feature cards are visible
  const featureCards = page.locator('.grid').filter({ hasText: /Profile Management|Live Updates|Edit Mode/ })
  await expect(featureCards).toBeVisible()
  
  // Check specific features
  await expect(page.getByText('Profile Management')).toBeVisible()
  await expect(page.getByText('Live Updates')).toBeVisible()
  await expect(page.getByText('Edit Mode')).toBeVisible()
  await expect(page.getByText('Custom Rendering')).toBeVisible()
  await expect(page.getByText('Data Export')).toBeVisible()
  await expect(page.getByText('NIP Support')).toBeVisible()
})
