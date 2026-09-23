'use client'

import { useEffect, useState } from 'react'

export type Locale = 'zh' | 'en'

export function LanguageToggle({ locale }: { locale: Locale }) {
  const [current, setCurrent] = useState(locale)

  useEffect(() => {
    window.localStorage.setItem('pricebook-locale', current)
  }, [current])

  function toggleLocale() {
    const next = current === 'zh' ? 'en' : 'zh'
    document.cookie = `pricebook-locale=${next}; path=/; max-age=31536000; samesite=lax`
    window.localStorage.setItem('pricebook-locale', next)
    setCurrent(next)
    window.location.reload()
  }

  return <button className="language-toggle" type="button" onClick={toggleLocale} aria-label={current === 'zh' ? 'Switch to English' : '切换中文'}>{current === 'zh' ? 'EN' : '中文'}</button>
}
