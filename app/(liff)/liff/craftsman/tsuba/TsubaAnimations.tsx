'use client'
import { useEffect } from 'react'

export default function TsubaAnimations() {
  useEffect(() => {
    /* ── カウントアップ ── */
    function animateCount(el: HTMLElement) {
      const target = parseInt(el.dataset.target ?? '0')
      const suffix = el.dataset.suffix ?? ''
      const duration = 1800
      const start = performance.now()
      function update(now: number) {
        const p = Math.min((now - start) / duration, 1)
        const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
        el.textContent = Math.floor(ease * target).toLocaleString() + suffix
        if (p < 1) requestAnimationFrame(update)
      }
      requestAnimationFrame(update)
    }

    const countSection = document.getElementById('count-section')
    if (countSection) {
      new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.querySelectorAll<HTMLElement>('[data-target]').forEach(animateCount)
            obs.unobserve(e.target)
          }
        })
      }, { threshold: 0.3 }).observe(countSection)
    }

    /* ── EP & PATH フェードイン ── */
    const fadeObs = new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible')
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' })

    document.querySelectorAll('.ep, .path-item').forEach(el => fadeObs.observe(el))

    /* ── タイムライン：スクロール連動 ── */
    const tlItems = Array.from(document.querySelectorAll<HTMLElement>('.tl-item'))

    function revealTlItem(item: HTMLElement) {
      if (item.dataset.tlDone) return
      item.dataset.tlDone = '1'
      item.classList.add('tl-revealed')

      const delays: Record<string, number> = { year: 0, dot: 80, line: 120, title: 160, desc: 240 }
      const qs = (s: string) => item.querySelector<HTMLElement>(s)
      ;([
        [qs('.tl-year'),  delays.year],
        [qs('.tl-dot'),   delays.dot],
        [qs('.tl-line'),  delays.line],
        [qs('.tl-title'), delays.title],
        [qs('.tl-desc'),  delays.desc],
      ] as [HTMLElement | null, number][]).forEach(([el, delay]) => {
        if (el) el.style.transitionDelay = delay + 'ms'
      })

      // 光の走査線
      const scan = document.createElement('div')
      scan.className = 'tl-scan'
      scan.style.top = (item.offsetTop + 4) + 'px'
      const wrap = item.parentElement
      if (wrap) {
        wrap.style.position = 'relative'
        wrap.appendChild(scan)
        setTimeout(() => {
          scan.style.transition = 'opacity 0.2s'
          scan.style.opacity = '1'
          setTimeout(() => {
            scan.style.transition = 'opacity 1.2s ease'
            scan.style.opacity = '0'
            setTimeout(() => scan.remove(), 1400)
          }, 300)
        }, 20)
      }
    }

    function checkTlReveal() {
      const vh = window.innerHeight
      tlItems.forEach((item, i) => {
        if (item.dataset.tlDone) return
        if (item.getBoundingClientRect().top < vh * 0.82) {
          if (i === 0 || tlItems[i - 1].dataset.tlDone) {
            setTimeout(() => revealTlItem(item), i === 0 ? 0 : 80)
          }
        }
      })
    }

    if (tlItems.length) {
      window.addEventListener('scroll', checkTlReveal, { passive: true })
      checkTlReveal()
    }

    /* ── これからの写真フェードイン ── */
    const futureImg = document.querySelector('.tl-future-img')
    if (futureImg) {
      new IntersectionObserver((entries, obs) => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('visible')
            obs.unobserve(e.target)
          }
        })
      }, { threshold: 0.15 }).observe(futureImg)
    }

    /* ── グレースケール ── */
    function updateGray() {
      const imgs = document.querySelectorAll<HTMLElement>('.ep-photo img')
      const vh = window.innerHeight
      imgs.forEach(img => {
        const r = img.getBoundingClientRect()
        const dist = Math.abs(r.top + r.height / 2 - vh / 2)
        const ratio = Math.min(dist / (vh * 0.6), 1)
        img.style.filter = `grayscale(${ratio.toFixed(3)}) brightness(${(1 - ratio * 0.1).toFixed(3)})`
      })
    }
    window.addEventListener('scroll', updateGray, { passive: true })
    updateGray()

    return () => {
      window.removeEventListener('scroll', checkTlReveal)
      window.removeEventListener('scroll', updateGray)
    }
  }, [])

  return null
}
