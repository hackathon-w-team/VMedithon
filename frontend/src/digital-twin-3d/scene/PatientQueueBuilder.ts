import * as THREE from 'three'
import type { Department3D } from '../adapters/types'
import { drawRoundRect } from '../utils/canvasUtils'

export class PatientQueueBuilder {
  /**
   * Generates patient waiting lounge, chairs, and patient figures matching patientsWaiting count.
   */
  public buildQueue(dept: Department3D): THREE.Group {
    const group = new THREE.Group()
    group.name = `queue-${dept.id}`

    const count = dept.patientsWaiting
    const waitingAreaZ = dept.depth / 2 + 3.0 // Placed just outside the entrance threshold

    // Waiting Area Floor Mat
    const matGeo = new THREE.PlaneGeometry(12, 5)
    matGeo.rotateX(-Math.PI / 2)
    const matMaterial = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.8,
    })
    const matMesh = new THREE.Mesh(matGeo, matMaterial)
    matMesh.position.set(0, 0.06, waitingAreaZ)
    group.add(matMesh)

    // Waiting Room Chairs (2 rows of 6 chairs)
    const chairGeo = new THREE.BoxGeometry(0.7, 0.5, 0.7)
    const chairBackGeo = new THREE.BoxGeometry(0.7, 0.6, 0.1)
    const chairMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })

    const chairCols = 6
    const chairSpacing = 1.6
    const startX = -((chairCols - 1) * chairSpacing) / 2

    // Patient geometries
    const headGeo = new THREE.SphereGeometry(0.2, 10, 10)
    const bodyGeo = new THREE.CylinderGeometry(0.18, 0.22, 0.6, 10)
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.6 })
    const patientMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }) // amber patient attire

    let patientIndex = 0
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < chairCols; c++) {
        const cx = startX + c * chairSpacing
        const cz = waitingAreaZ + (r === 0 ? -1.0 : 1.0)

        // Chair base
        const chair = new THREE.Mesh(chairGeo, chairMat)
        chair.position.set(cx, 0.3, cz)
        group.add(chair)

        // Chair back
        const chairBack = new THREE.Mesh(chairBackGeo, chairMat)
        chairBack.position.set(cx, 0.65, cz - 0.3)
        group.add(chairBack)

        // If patient waiting, place seated figure
        if (patientIndex < count) {
          const patient = new THREE.Group()
          patient.position.set(cx, 0.55, cz)

          const body = new THREE.Mesh(bodyGeo, patientMat)
          body.position.y = 0.3
          patient.add(body)

          const head = new THREE.Mesh(headGeo, skinMat)
          head.position.y = 0.7
          patient.add(head)

          group.add(patient)
          patientIndex++
        }
      }
    }

    // Overflow standing patients if count > 12
    const overflow = count - 12
    for (let i = 0; i < overflow && i < 16; i++) {
      const standing = new THREE.Group()
      const sx = startX + (i % chairCols) * 1.5 + (Math.random() - 0.5) * 0.4
      const sz = waitingAreaZ + 2.5 + Math.floor(i / chairCols) * 1.2
      standing.position.set(sx, 0.08, sz)

      const body = new THREE.Mesh(bodyGeo, patientMat)
      body.position.y = 0.7
      standing.add(body)

      const head = new THREE.Mesh(headGeo, skinMat)
      head.position.y = 1.15
      standing.add(head)

      group.add(standing)
    }

    // If congested (> 8 patients), render a glowing queue warning sign
    if (count >= 8) {
      const warning = this.createQueueBanner(count)
      warning.position.set(0, 2.8, waitingAreaZ)
      group.add(warning)
    }

    group.position.set(dept.gridX, 0, dept.gridZ)
    return group
  }

  private createQueueBanner(count: number): THREE.Mesh {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 80
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return new THREE.Mesh(new THREE.PlaneGeometry(2.8, 0.9), new THREE.MeshBasicMaterial({ color: 0xdc2626 }))
    }

    ctx.fillStyle = '#dc2626'
    drawRoundRect(ctx, 4, 4, 248, 72, 10)
    ctx.fill()

    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 22px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${count} PATIENTS WAITING`, 128, 40)

    ctx.font = '14px Inter, sans-serif'
    ctx.fillText('HIGH QUEUE PRESSURE', 128, 62)

    const texture = new THREE.CanvasTexture(canvas)
    const mat = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true })
    const geo = new THREE.PlaneGeometry(2.8, 0.9)
    return new THREE.Mesh(geo, mat)
  }
}
