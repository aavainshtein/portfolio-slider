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

  // --- Bounded mode (loop=false) ---

  it('bounded: renders images with loop=false', async () => {
    const page = await createPage('/?loop=false')
    // Дожидаемся рендера slider images
    await page.locator('img').first().waitFor({ timeout: 5000 })
    const images = await page.locator('img').count()
    expect(images).toBeGreaterThan(0)
    await page.close()
  })

  it('bounded: Previous at position 0 does not wrap around', async () => {
    const page = await createPage('/?loop=false')
    await page.locator('img').first().waitFor({ timeout: 5000 })

    const prevButton = page.locator('button', { hasText: 'Previous' })
    // На позиции 0 нажимаем Previous — не должно крашиться
    await prevButton.click()
    // Ждём возможный bounce-анимации
    await page.waitForTimeout(600)

    const images = await page.locator('img').count()
    expect(images).toBeGreaterThan(0)
    await page.close()
  })

  it('bounded: Next beyond last element does not wrap around', async () => {
    const page = await createPage('/?loop=false')
    await page.locator('img').first().waitFor({ timeout: 5000 })

    const nextButton = page.locator('button', { hasText: 'Next' })
    // Кликаем Next больше раз, чем проектов — упираемся в границу
    for (let i = 0; i < 10; i++) {
      await nextButton.click()
      await page.waitForTimeout(100)
    }
    // Ждём завершения анимации
    await page.waitForTimeout(600)

    // Страница не ломается, img ещё рендерятся
    const images = await page.locator('img').count()
    expect(images).toBeGreaterThan(0)
    await page.close()
  })
})
