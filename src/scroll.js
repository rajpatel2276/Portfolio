export const STATIONS = 5 // Home, About, Projects, Skills, Contact

export const lenisRef = { current: null }
export const scrollState = { progress: 0, velocity: 0, active: 0, revealed: false }

const subs = new Set()

export function subscribeActive(fn) {
  subs.add(fn)
  return () => {
    subs.delete(fn)
  }
}

// active = index of the station we are resting at, or -1 while travelling
export function setActive(i) {
  if (scrollState.active === i) return
  scrollState.active = i
  subs.forEach((fn) => fn(i))
}

export function scrollToStation(i) {
  const l = lenisRef.current
  if (!l) return
  l.scrollTo((i / (STATIONS - 1)) * l.limit, { duration: 2.2 })
}