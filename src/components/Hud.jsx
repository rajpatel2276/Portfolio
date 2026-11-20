import { useEffect, useState } from 'react'
import { scrollToStation } from '../scroll'

const NAMES = ['Home', 'About', 'Projects', 'Skills', 'Contact']

export default function Hud({ revealed, active }) {
  const [last, setLast] = useState(0)
  useEffect(() => {
    if (active >= 0) setLast(active)
  }, [active])

  const cur = active >= 0 ? active : last
  const cls = revealed ? 'show' : ''
  const home = revealed && active === 0

  return (
    <>
      <div className="progress" />
      <div className={`logo ${cls}`}>
        RP<span>.</span>
      </div>
      <nav className={`nav ${cls}`}>
        {NAMES.slice(1).map((n, i) => (
          <button key={n} className={cur === i + 1 ? 'on' : ''} onClick={() => scrollToStation(i + 1)}>
            {n}
          </button>
        ))}
      </nav>
      <div className={`section-index ${cls}`}>
        0{cur + 1} — {NAMES[cur]}
      </div>
      <div className={`drag-hint ${home ? 'show' : ''}`}>Drag to swing · Click to flip</div>
      <div className={`scroll-hint ${home ? 'show' : ''}`}>Scroll to explore</div>
    </>
  )
}