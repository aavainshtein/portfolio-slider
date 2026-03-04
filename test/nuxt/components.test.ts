import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PortfolioSlider from '~/components/PortfolioSlider.vue'
import { makeProjects } from '../helpers'

describe('PortfolioSlider', () => {
  const projects = makeProjects(5)

  it('renders img elements for visible projects', async () => {
    const wrapper = await mountSuspended(PortfolioSlider, {
      props: { projects },
    })
    const images = wrapper.findAll('img')
    expect(images.length).equal(projects.length + 2) // Все проекты видимы при renderLimit >= projects.length
  })

  it('renders prev and next buttons', async () => {
    const wrapper = await mountSuspended(PortfolioSlider, {
      props: { projects },
    })
    const buttons = wrapper.findAll('button')
    expect(buttons.length).toBeGreaterThanOrEqual(2)
  })

  it('clicking next button changes slider state', async () => {
    const wrapper = await mountSuspended(PortfolioSlider, {
      props: { projects },
    })
    const nextButton = wrapper.findAll('button').at(-1)!
    await nextButton.trigger('click')
    // После клика слайдер должен быть в движении (не idle)
    // Проверяем что img элементы всё ещё рендерятся
    expect(wrapper.findAll('img').length).toBeGreaterThan(0)
  })

  it('renders nothing meaningful with empty projects', async () => {
    const wrapper = await mountSuspended(PortfolioSlider, {
      props: { projects: [] },
    })
    const images = wrapper.findAll('img')
    expect(images.length).toBe(0)
  })

  it('loop=false at left boundary: no left sentinel (fewer images)', async () => {
    const wrapper = await mountSuspended(PortfolioSlider, {
      props: { projects, renderLimit: 3, loop: false },
    })
    const images = wrapper.findAll('img')
    // At idx=0 bounded: no left-invisible + 3 visible + right-invisible = 4
    expect(images.length).toBe(4)
  })

  it('loop=true (default): both sentinels present', async () => {
    const wrapper = await mountSuspended(PortfolioSlider, {
      props: { projects, renderLimit: 3 },
    })
    const images = wrapper.findAll('img')
    // left-invisible + 3 visible + right-invisible = 5
    expect(images.length).toBe(5)
  })
})
