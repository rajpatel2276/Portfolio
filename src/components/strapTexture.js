import * as THREE from 'three'

export const STRAP_W = 0.26
export const STRAP_TILE = STRAP_W * 8 // canvas is 128 x 1024, so the aspect ratio matches exactly

const CW = 128
const CH = 1024

function noise(ctx, n, alpha) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`
    ctx.fillRect(Math.random() * CW, Math.random() * CH, 1, 1)
  }
}

function stitches(ctx, color) {
  ctx.setLineDash([10, 7])
  ctx.lineWidth = 2
  ctx.strokeStyle = color
  ;[11, CW - 11].forEach((x) => {
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, CH)
    ctx.stroke()
  })
  ctx.setLineDash([])
}

function printText(ctx, color) {
  ctx.fillStyle = color
  ctx.font = '800 34px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ;[['RAJ PATEL', 256], ['ML ENGINEER', 768]].forEach(([t, y]) => {
    ctx.save()
    ctx.translate(CW / 2, y)
    ctx.rotate(Math.PI / 2)
    ctx.fillText(t, 0, 0)
    ctx.restore()
  })
  // small diamonds between the words
  ;[0, 512, 1024].forEach((y) => {
    ctx.save()
    ctx.translate(CW / 2, y)
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-7, -7, 14, 14)
    ctx.restore()
  })
}

function prep(canvas, srgb) {
  const t = new THREE.CanvasTexture(canvas)
  t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 16
  if (srgb) t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function makeStrapTextures() {
  // ---------- colour map ----------
  const c = document.createElement('canvas')
  c.width = CW
  c.height = CH
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#b95115'
  ctx.fillRect(0, 0, CW, CH)

  // grosgrain ribs
  for (let y = 0; y < CH; y += 4) {
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.fillRect(0, y, CW, 1)
    ctx.fillStyle = 'rgba(0,0,0,0.16)'
    ctx.fillRect(0, y + 2, CW, 1)
  }
  noise(ctx, 9000, 0.08)

  // darker, rounded-looking edges
  const eg = ctx.createLinearGradient(0, 0, CW, 0)
  eg.addColorStop(0, 'rgba(0,0,0,0.4)')
  eg.addColorStop(0.1, 'rgba(0,0,0,0)')
  eg.addColorStop(0.9, 'rgba(0,0,0,0)')
  eg.addColorStop(1, 'rgba(0,0,0,0.4)')
  ctx.fillStyle = eg
  ctx.fillRect(0, 0, CW, CH)

  stitches(ctx, 'rgba(255,240,228,0.6)')
  printText(ctx, 'rgba(255,244,234,0.94)')

  // ---------- bump map ----------
  const b = document.createElement('canvas')
  b.width = CW
  b.height = CH
  const bctx = b.getContext('2d')
  bctx.fillStyle = '#808080'
  bctx.fillRect(0, 0, CW, CH)
  for (let y = 0; y < CH; y += 4) {
    bctx.fillStyle = '#b0b0b0'
    bctx.fillRect(0, y, CW, 2)
  }
  noise(bctx, 9000, 0.12)
  stitches(bctx, '#404040')
  printText(bctx, '#9a9a9a')

  return { map: prep(c, true), bump: prep(b, false) }
}