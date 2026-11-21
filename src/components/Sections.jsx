import { PROFILE, FEATURED, MORE, SKILL_GROUPS, WORLD_INFO } from '../content'
import { ST, scrollToStation } from '../scroll'

function Panel({ on, eyebrow, title, text, children }) {
  return (
    <section className={`panel ${on ? 'show' : ''}`}>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {text && <p className="blurb">{text}</p>}
      {children}
    </section>
  )
}

function Ext({ href, children }) {
  return (
    <a className="plink" href={href} target="_blank" rel="noreferrer noopener">
      {children} ↗
    </a>
  )
}

export default function Sections({ active }) {
  return (
    <>
      <Panel
        on={active === ST.ABOUT}
        eyebrow="02 — About"
        title={
          <>
            Building AI from <span>first principles</span>
          </>
        }
        text="I’m a computer science undergraduate focused on computer vision and deep learning optimization. I write neural networks from the maths up, and run real-time vision and RAG systems on local GPU infrastructure."
      >
        <ul className="facts">
          <li>
            <b>Education</b>
            <span>B.Tech CSE · KNIT Sultanpur · CGPA 8.1 (2023 – 2027)</span>
          </li>
          <li>
            <b>Focus</b>
            <span>Computer vision · Deep learning · Model optimization</span>
          </li>
          <li>
            <b>Learning</b>
            <span>Karpathy’s Zero to Hero · DeepLearning.AI specializations</span>
          </li>
          <li>
            <b>Recognised</b>
            <span>Approved delegate, India AI Impact Summit 2026 (New Delhi)</span>
          </li>
        </ul>
      </Panel>

      <Panel
        on={active === ST.PROJECTS}
        eyebrow="03 — Projects"
        title={
          <>
            Selected <span>work</span>
          </>
        }
        text="Scroll on, or click a card, to step into each project’s world."
      >
        <ul className="facts">
          {FEATURED.map((p) => (
            <li key={p.no}>
              <b>{p.no}</b>
              <span>
                <strong>{p.title}</strong>
                <span className="line">
                  <br />
                  {p.line}
                </span>
                <small className="stack">{p.stack}</small>
                <Ext href={p.url}>Repository</Ext>
              </span>
            </li>
          ))}
        </ul>
        <p className="more">
          Also:{' '}
          {MORE.map((m, i) => (
            <span key={m.title}>
              {i > 0 && ' · '}
              <Ext href={m.url}>{m.title}</Ext>
            </span>
          ))}
        </p>
      </Panel>

      {FEATURED.map((p, i) => {
        const info = WORLD_INFO[p.key] || {}
        const idx = ST.WORLD0 + i
        const last = i === FEATURED.length - 1
        return (
          <Panel
            key={p.key}
            on={active === idx}
            eyebrow={`03.${i + 1} — Project ${p.no}`}
            title={<span>{p.title}</span>}
            text={info.blurb || p.line}
          >
            <ul className="facts">
              {(info.facts || []).map(([label, text], j) => (
                <li key={label} className={j >= 3 ? 'opt' : ''}>
                  <b>{label}</b>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
            <div className="cta">
              <a className="btn primary" href={p.url} target="_blank" rel="noreferrer noopener">
                View repository ↗
              </a>
              <button className="btn" onClick={() => scrollToStation(idx + 1)}>
                {last ? 'Continue ↓' : 'Next world ↓'}
              </button>
            </div>
          </Panel>
        )
      })}

      <Panel
        on={active === ST.SKILLS}
        eyebrow="04 — Skills"
        title={
          <>
            Tools I <span>think in</span>
          </>
        }
        text="The frameworks, maths and tooling behind the projects."
      >
        <div>
          {SKILL_GROUPS.map(([group, items]) => (
            <div key={group}>
              <p className="group">{group}</p>
              <div className="chips">
                {items.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel
        on={active === ST.CONTACT}
        eyebrow="05 — Contact"
        title={
          <>
            Let’s build <span>something</span>
          </>
        }
        text="Have a computer vision or deep learning problem worth solving? I’d love to hear about it."
      >
        <div className="cta">
          <a className="btn primary" href={`mailto:${PROFILE.email}`}>
            Say hello
          </a>
          <a className="btn" href={PROFILE.resumePath} download>
            Resume ↓
          </a>
          <a className="btn" href={PROFILE.github} target="_blank" rel="noreferrer noopener">
            GitHub
          </a>
          <a className="btn" href={PROFILE.linkedin} target="_blank" rel="noreferrer noopener">
            LinkedIn
          </a>
        </div>
        <p className="more">{PROFILE.email}</p>
      </Panel>
    </>
  )
}