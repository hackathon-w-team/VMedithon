import * as THREE from 'three'
import type { Department3D, RippleEffect3D } from '../adapters/types'
import { drawRoundRect } from '../utils/canvasUtils'

interface ActiveRippleArc {
  curve: THREE.CatmullRomCurve3
  pulseMesh: THREE.Mesh
  t: number
  speed: number
  badgeMesh?: THREE.Mesh
}

export class RippleEffectRenderer {
  private rippleGroup = new THREE.Group()
  private activeArcs: ActiveRippleArc[] = []
  private ringMeshes: { mesh: THREE.Mesh; scale: number; basePos: THREE.Vector3 }[] = []

  constructor() {
    this.rippleGroup.name = 'ripple-effects'
  }

  public getGroup(): THREE.Group {
    return this.rippleGroup
  }

  public updateRipples(ripples: RippleEffect3D[], departments: Department3D[]) {
    // Clear previous
    while (this.rippleGroup.children.length > 0) {
      const child = this.rippleGroup.children[0]
      this.rippleGroup.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
        else child.material?.dispose()
      }
    }
    this.activeArcs = []
    this.ringMeshes = []

    const deptMap = new Map<string, Department3D>()
    departments.forEach((d) => deptMap.set(d.id, d))

    ripples.forEach((rip) => {
      const from = deptMap.get(rip.fromDeptId)
      const to = deptMap.get(rip.toDeptId)
      if (!from || !to) return

      const isPositive = rip.impactType === 'positive'
      const rippleColor = isPositive ? 0x10b981 : 0xef4444

      // 1. High Arch Spline Curve between zones
      const startPt = new THREE.Vector3(from.gridX, 2.5, from.gridZ)
      const midPt = new THREE.Vector3((from.gridX + to.gridX) / 2, 7.5, (from.gridZ + to.gridZ) / 2)
      const endPt = new THREE.Vector3(to.gridX, 2.5, to.gridZ)

      const curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt])

      // Glowing baseline path line
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.18, 8, false)
      const tubeMat = new THREE.MeshBasicMaterial({
        color: rippleColor,
        transparent: true,
        opacity: 0.45,
      })
      const tube = new THREE.Mesh(tubeGeo, tubeMat)
      this.rippleGroup.add(tube)

      // Animated traveling energy sphere / pulse
      const pulseGeo = new THREE.SphereGeometry(0.55, 12, 12)
      const pulseMat = new THREE.MeshBasicMaterial({ color: rippleColor })
      const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat)
      this.rippleGroup.add(pulseMesh)

      // Floating Message Badge at apex of arch
      const badge = this.createRippleBadge(rip.message, isPositive)
      badge.position.copy(midPt).add(new THREE.Vector3(0, 1.2, 0))
      this.rippleGroup.add(badge)

      this.activeArcs.push({
        curve,
        pulseMesh,
        t: 0,
        speed: 0.35,
        badgeMesh: badge,
      })

      // Ground Expanding Rings around destination
      const ringGeo = new THREE.RingGeometry(2.0, 2.6, 24)
      ringGeo.rotateX(-Math.PI / 2)
      const ringMat = new THREE.MeshBasicMaterial({
        color: rippleColor,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
      })
      const ringMesh = new THREE.Mesh(ringGeo, ringMat)
      ringMesh.position.set(to.gridX, 0.15, to.gridZ)
      this.rippleGroup.add(ringMesh)

      this.ringMeshes.push({
        mesh: ringMesh,
        scale: 1.0,
        basePos: new THREE.Vector3(to.gridX, 0.15, to.gridZ),
      })
    })
  }

  private createRippleBadge(text: string, isPositive: boolean): THREE.Mesh {
    const canvas = document.createElement('canvas')
    canvas.width = 384
    canvas.height = 96
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return new THREE.Mesh(new THREE.PlaneGeometry(5.2, 1.3), new THREE.MeshBasicMaterial({ color: isPositive ? 0x10b981 : 0xef4444 }))
    }

    ctx.fillStyle = isPositive ? 'rgba(6, 78, 59, 0.95)' : 'rgba(127, 29, 29, 0.95)'
    drawRoundRect(ctx, 8, 8, 368, 80, 12)
    ctx.fill()

    ctx.lineWidth = 3
    ctx.strokeStyle = isPositive ? '#34d399' : '#f87171'
    ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(isPositive ? '⚡ RIPPLE IMPROVEMENT' : '⚠ BOARDING RIPPLE PRESSURE', 192, 38)

    ctx.font = '14px Inter, sans-serif'
    ctx.fillStyle = '#e2e8f0'
    // Trim text if long
    const shortText = text.length > 38 ? text.substring(0, 36) + '…' : text
    ctx.fillText(shortText, 192, 65)

    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true })
    const geo = new THREE.PlaneGeometry(5.2, 1.3)
    return new THREE.Mesh(geo, mat)
  }

  public animate(deltaTime: number) {
    // Pulse along arch
    this.activeArcs.forEach((arc) => {
      arc.t = (arc.t + arc.speed * deltaTime) % 1.0
      const pt = arc.curve.getPointAt(arc.t)
      arc.pulseMesh.position.copy(pt)
    })

    // Ground wave expansion
    this.ringMeshes.forEach((r) => {
      r.scale += deltaTime * 1.5
      if (r.scale > 3.5) r.scale = 1.0
      r.mesh.scale.set(r.scale, r.scale, r.scale)
      const mat = r.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = Math.max(0, 0.8 * (1.0 - (r.scale - 1.0) / 2.5))
    })
  }

  public dispose() {
    this.updateRipples([], [])
  }
}
