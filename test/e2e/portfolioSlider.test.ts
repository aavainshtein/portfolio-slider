import { describe, it, expect } from 'vitest'
import { setup, $fetch, createPage } from '@nuxt/test-utils/e2e'

describe('PortfolioSlider E2E', async () => {
  await setup({
    browser: true,
  })

  it('page renders without errors', async () => {
    const html = await $fetch('/')
    expect(html).toContain('</html>')
  })

  it('slider renders images on the page', async () => {
    const page = await createPage('/')
    const images = await page.locator('img').count()
    expect(images).toBeGreaterThan(0)
    await page.close()
  })

  it('next button exists and is clickable', async () => {
    const page = await createPage('/')

    const nextButton = page.locator('button', { hasText: 'Next' })
    await nextButton.click()
    await nextButton.click()
    // После клика страница не ломается, img ещё рендерятся
    const images = await page.locator('img').count()
    expect(images).toBeGreaterThan(0)
    await page.close()
  })
})
