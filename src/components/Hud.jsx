import { useEffect, useState } from 'react'
import { scrollToStation, ST, STATION_INFO } from '../scroll'
import { FEATURED } from '../content'

const NAV = [
  ['About', ST.ABOUT],
  ['Projects', ST.PROJECTS],
  ['Skills', ST.SKILLS],
  ['Contact', ST.CONTACT],
]

// side dots: the Projects overview, then one per world
const DOTS = [
  { st: ST.PROJECTS, label: 'Projects overview' },
  ...FEATURED.map((p, i) => ({ st: ST.WORLD0 + i, label: p.title })),
]

export default function Hud({ revealed, active }) {
  const [last, setLast] = useState(0)
  useEffect(() => {
    if (active >= 0) setLast(active)
  }, [active])

  const cur = active >= 0 ? active : last
  const info = STATION_INFO[cur]
  const cls = revealed ? 'show' : ''
  const home = revealed && active === 0
  const inProjects = revealed && info.nav === 'Projects'

  return (
    <>
      <div className="progress" />
      <div className={`logo ${cls}`}>
        RP<span>.</span>
      </div>

      <nav className={`nav ${cls}`}>
        {NAV.map(([name, st]) => (
          <button key={name} className={info.nav === name ? 'on' : ''} onClick={() => scrollToStation(st)}>
            {name}
          </button>
        ))}
      </nav>

      <div className={`world-dots ${inProjects ? 'show' : ''}`}>
        {DOTS.map((d) => (
          <button
            key={d.st}
            className={cur === d.st ? 'on' : ''}
            title={d.label}
            aria-label={d.label}
            onClick={() => scrollToStation(d.st)}
          />
        ))}
      </div>

      <div className={`section-index ${cls}`}>
        {info.index} — {info.label}
      </div>
      <div className={`drag-hint ${home ? 'show' : ''}`}>Drag to swing · Click to flip</div>
      <div className={`scroll-hint ${home ? 'show' : ''}`}>Scroll to explore</div>
    </>
  )
}