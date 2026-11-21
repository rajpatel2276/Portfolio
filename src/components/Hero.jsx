import { useEffect, useState } from 'react'
import { scrollToStation, ST } from '../scroll'
import { PROFILE, ROTATING } from '../content'

function Rotator() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % ROTATING.length), 2400)
    return () => clearInterval(t)
  }, [])
  return (
    <span className="rot" key={i}>
      {ROTATING[i]}
    </span>
  )
}

export default function Hero({ show }) {
  const [first, last] = PROFILE.name.split(' ')
  return (
    <main className={`hero ${show ? 'show' : ''}`}>
      <p className="eyebrow">Hello, I’m</p>
      <h1>
        {first} <span>{last}</span>
      </h1>
      <p className="role">
        {PROFILE.role} <i>/</i> <Rotator />
      </p>
      <p className="blurb">
        Computer vision and deep learning optimization. I build neural networks from first
        principles in NumPy and deploy real-time vision and RAG systems on local GPU
        infrastructure.
      </p>
      <div className="cta">
        <button className="btn primary" onClick={() => scrollToStation(ST.PROJECTS)}>
          View my work
        </button>
        <button className="btn" onClick={() => scrollToStation(ST.CONTACT)}>
          Get in touch
        </button>
      </div>
    </main>
  )
}