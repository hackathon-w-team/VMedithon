import * as THREE from 'three'
import type { Department3D } from '../adapters/types'
import { drawRoundRect } from '../utils/canvasUtils'

export class StaffBuilder {
  /**
   * Builds stylized staff figures according to staffAssigned data.
   */
  public buildStaff(dept: Department3D): THREE.Group {
    const group = new THREE.Group()
    group.name = `staff-${dept.id}`

    const count = dept.staffAssigned
    if (count <= 0) return group

    // Shared geometry for figures
    const headGeo = new THREE.SphereGeometry(0.24, 12, 12)
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.28, 0.85, 12)
    const legsGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.7, 8)

    // Materials for medical roles
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 })
    const doctorCoatMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })
    const scrubBlueMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 })
    const scrubTealMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.5 })
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 })

    // Nursing / Doctor Central Station desk
    const stationDesk = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 0.9, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 }),
    )
    stationDesk.position.set(0, 0.45 + 0.4, 5.0)
    group.add(stationDesk)

    // Layout positions around the department
    // Half near the central station desk, half walking between patient beds
    for (let i = 0; i < count; i++) {
      const figure = new THREE.Group()

      // Alternate roles: 0 = Doctor, 1 = Nurse, 2 = Tech/Specialist
      const role = i % 3
      let topMat = scrubBlueMat
      if (role === 0) topMat = doctorCoatMat
      else if (role === 2) topMat = scrubTealMat

      // Head
      const head = new THREE.Mesh(headGeo, skinMat)
      head.position.y = 1.6
      figure.add(head)

      // Torso / Scrub
      const body = new THREE.Mesh(bodyGeo, topMat)
      body.position.y = 1.05
      figure.add(body)

      // Stethoscope or ID badge
      const badge = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.16, 0.04),
        new THREE.MeshBasicMaterial({ color: role === 0 ? 0xef4444 : 0x38bdf8 }),
      )
      badge.position.set(0, 1.2, 0.28)
      figure.add(badge)

      // Legs
      const leftLeg = new THREE.Mesh(legsGeo, pantsMat)
      leftLeg.position.set(-0.12, 0.35, 0)
      figure.add(leftLeg)

      const rightLeg = new THREE.Mesh(legsGeo, pantsMat)
      rightLeg.position.set(0.12, 0.35, 0)
      figure.add(rightLeg)

      // Position figure
      if (i < 4) {
        // At nursing station desk
        figure.position.set((i - 1.5) * 1.0, 0.4, 4.0)
      } else {
        // At ward beds or diagnostic bays
        const angle = (i / count) * Math.PI * 2
        const radius = 4.5 + (i % 3) * 1.5
        const fx = Math.cos(angle) * radius
        const fz = Math.sin(angle) * (radius * 0.7) - 1.0
        figure.position.set(fx, 0.4, fz)
        figure.rotation.y = angle + Math.PI / 2
      }

      group.add(figure)
    }

    // If shortage, place a floating shortage warning icon above station
    if (dept.staffShortage > 0) {
      const warningBadge = this.createShortageBadge(dept.staffShortage)
      warningBadge.position.set(0, 3.2, 5.0)
      group.add(warningBadge)
    }

    group.position.set(dept.gridX, 0, dept.gridZ)
    return group
  }

  private createShortageBadge(shortage: number): THREE.Mesh {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 96
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshBasicMaterial({ color: 0xef4444 }))
    }

    ctx.fillStyle = '#ef4444'
    drawRoundRect(ctx, 8, 8, 240, 80, 12)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`-${shortage} STAFF`, 128, 45)

    ctx.font = '16px Inter, sans-serif'
    ctx.fillText('SHORTAGE', 128, 70)

    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true })
    const geo = new THREE.PlaneGeometry(2.4, 0.9)
    return new THREE.Mesh(geo, mat)
  }
}
