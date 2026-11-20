import * as THREE from 'three'
import { THEME, rgba } from '../theme'
import QRCode from 'qrcode'

const W = 800
const H = 1125 // matches the 1.6 x 2.25 card ratio

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function makeCanvas() {
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  return c
}

function toTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 16
  return t
}

function cardBase(ctx) {
  ctx.clearRect(0, 0, W, H)
  roundRect(ctx, 0, 0, W, H, 56)
  ctx.clip()

  const g = ctx.createLinearGradient(0, 0, W, H)
  g.addColorStop(0, THEME.primaryDeep)
  g.addColorStop(0.5, '#000000')
  g.addColorStop(1, THEME.bg)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(255,255,255,0.045)'
  ctx.lineWidth = 2
  for (let x = 0; x <= W; x += 50) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y <= H; y += 50) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  ctx.fillStyle = THEME.primary
  ctx.fillRect(0, 0, W, 26)
  roundRect(ctx, W / 2 - 70, 58, 140, 26, 13)
  ctx.fillStyle = THEME.bg
  ctx.fill()
}

export function makeFrontTexture(img) {
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')
  cardBase(ctx)

  // glow behind the person
  const glow = ctx.createRadialGradient(W / 2, 470, 20, W / 2, 470, 380)
  glow.addColorStop(0, rgba(THEME.primary, 0.85))
  glow.addColorStop(1, rgba(THEME.primary, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, 900)

  // big faint "ML" watermark
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.07)'
  ctx.font = '900 460px system-ui, sans-serif'
  ctx.fillText('ML', W / 2, 600)

  ctx.fillStyle = THEME.primarySoft
  ctx.font = '600 30px system-ui, sans-serif'
  ctx.fillText('MACHINE LEARNING DIVISION', W / 2, 135)

  // the cutout, placed straight onto the card
  const dw = 740
  const dh = (img.height * dw) / img.width
  ctx.drawImage(img, (W - dw) / 2, 150, dw, dh)

  // fade the bottom of the cutout into the name panel
  const fade = ctx.createLinearGradient(0, 700, 0, 840)
  fade.addColorStop(0, 'rgba(10,8,8,0)')
  fade.addColorStop(1, 'rgba(10,8,8,0.97)')
  ctx.fillStyle = fade
  ctx.fillRect(0, 700, W, H - 700)

  // accent line, name, role
  ctx.fillStyle = THEME.primary
  ctx.fillRect(W / 2 - 60, 835, 120, 6)
  ctx.fillStyle = THEME.cream
  ctx.font = '800 80px system-ui, sans-serif'
  ctx.fillText('RAJ PATEL', W / 2, 925)
  ctx.fillStyle = THEME.accent
  ctx.font = '600 42px system-ui, sans-serif'
  ctx.fillText('ML ENGINEER', W / 2, 982)

  // barcode
  ctx.fillStyle = THEME.cream
  let x = 150
  let seed = 7
  while (x < W - 150) {
    seed = (seed * 9301 + 49297) % 233280
    const bw = 3 + (seed % 3) * 3
    ctx.fillRect(x, 1012, bw, 55)
    x += bw + 5
  }
  ctx.font = '500 22px monospace'
  ctx.fillStyle = '#8f8480'
  ctx.fillText('ID 0001 · ACCESS: ALL AREAS', W / 2, 1100)

  return toTexture(canvas)
}

export function makeBackTexture(url) {
  const canvas = makeCanvas()
  const ctx = canvas.getContext('2d')
  cardBase(ctx)

  const glow = ctx.createRadialGradient(W / 2, 760, 20, W / 2, 760, 420)
  glow.addColorStop(0, rgba(THEME.primary, 0.3))
  glow.addColorStop(1, rgba(THEME.primary, 0))
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, W, H)

  ctx.textAlign = 'center'
  ctx.fillStyle = THEME.cream
  ctx.font = '800 56px system-ui, sans-serif'
  ctx.fillText('RAJ PATEL', W / 2, 170)
  ctx.fillStyle = THEME.accent
  ctx.font = '600 32px system-ui, sans-serif'
  ctx.fillText('Machine Learning Engineer', W / 2, 218)

  ctx.textAlign = 'left'
  ctx.fillStyle = '#8f8480'
  ctx.font = '600 26px system-ui, sans-serif'
  ctx.fillText('FOCUS', 110, 295)
  const focus = ['Computer Vision', 'Deep Learning', 'Model Optimization', 'Multimodal RAG']
  ctx.font = '500 38px system-ui, sans-serif'
  focus.forEach((s, i) => {
    ctx.fillStyle = THEME.primary
    ctx.fillRect(110, 338 + i * 56, 14, 14)
    ctx.fillStyle = THEME.cream
    ctx.fillText(s, 145, 353 + i * 56)
  })

  // QR code to the resume: dark modules on a cream tile (4-module quiet zone)
  const TILE = 440
  const tx = (W - TILE) / 2
  const ty = 570
  roundRect(ctx, tx, ty, TILE, TILE, 30)
  ctx.fillStyle = THEME.cream
  ctx.fill()

  const qr = QRCode.create(url, { errorCorrectionLevel: 'M' })
  const n = qr.modules.size
  const cell = Math.floor(TILE / (n + 8))
  const off = (TILE - cell * n) / 2
  ctx.fillStyle = '#120b09'
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.modules.get(r, c)) {
        ctx.fillRect(tx + off + c * cell, ty + off + r * cell, cell, cell)
      }
    }
  }

  ctx.textAlign = 'center'
  ctx.fillStyle = THEME.cream
  ctx.font = '700 30px system-ui, sans-serif'
  ctx.fillText('SCAN FOR RESUME', W / 2, 1056)
  ctx.fillStyle = '#8f8480'
  ctx.font = '500 22px monospace'
  ctx.fillText('github.com/rajpatel2276', W / 2, 1096)

  return toTexture(canvas)
}