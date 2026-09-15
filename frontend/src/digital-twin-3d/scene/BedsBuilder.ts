import * as THREE from 'three'
import type { Department3D } from '../adapters/types'

export class BedsBuilder {
  /**
   * Generates beds or department-specific primary equipment for a department.
   */
  public buildResources(dept: Department3D): THREE.Group {
    const group = new THREE.Group()
    group.name = `resources-${dept.id}`

    if (dept.bedsTotal > 0) {
      this.populateBeds(group, dept)
    } else if (dept.type === 'radiology') {
      this.populateRadiologyEquipment(group)
    }

    group.position.set(dept.gridX, 0, dept.gridZ)
    return group
  }

  /**
   * Populates hospital bed units arranged neatly in a multi-row ward layout.
   */
  private populateBeds(parent: THREE.Group, dept: Department3D) {
    const { bedsTotal, bedsOccupied, width, depth } = dept

    // We arrange beds in two wings or a grid inside the room
    const cols = Math.min(Math.ceil(bedsTotal / 2), 10)
    const rows = Math.ceil(bedsTotal / cols)

    const spacingX = Math.min(2.4, (width - 6) / Math.max(cols, 1))
    const spacingZ = Math.min(3.6, (depth - 6) / Math.max(rows, 1))

    const startX = -((cols - 1) * spacingX) / 2
    const startZ = -((rows - 1) * spacingZ) / 2 - 1.0

    // Shared geometries for performance
    const frameGeo = new THREE.BoxGeometry(1.4, 0.4, 2.2)
    const mattressGeo = new THREE.BoxGeometry(1.3, 0.25, 2.1)
    const pillowGeo = new THREE.BoxGeometry(0.9, 0.15, 0.5)
    const monitorPoleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.8, 8)
    const monitorScreenGeo = new THREE.BoxGeometry(0.4, 0.3, 0.1)

    // Shared materials
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.8, roughness: 0.3 })
    const emptyMattressMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 })
    const occupiedMattressMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 }) // hospital blue sheet
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.8 })
    const monitorPoleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
    const monitorOkMat = new THREE.MeshBasicMaterial({ color: 0x10b981 })
    const monitorCritMat = new THREE.MeshBasicMaterial({ color: 0xef4444 })

    let bedIndex = 0
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (bedIndex >= bedsTotal) break

        const isOccupied = bedIndex < bedsOccupied
        const bedGroup = new THREE.Group()
        bedGroup.position.set(startX + c * spacingX, 0.4, startZ + r * spacingZ)

        // Bed frame
        const frame = new THREE.Mesh(frameGeo, frameMat)
        frame.position.y = 0.2
        frame.castShadow = true
        bedGroup.add(frame)

        // Mattress
        const mattress = new THREE.Mesh(mattressGeo, isOccupied ? occupiedMattressMat : emptyMattressMat)
        mattress.position.y = 0.45
        bedGroup.add(mattress)

        // Pillow
        const pillow = new THREE.Mesh(pillowGeo, pillowMat)
        pillow.position.set(0, 0.6, -0.7)
        bedGroup.add(pillow)

        // If occupied, add bedside vital sign telemetry monitor & IV drip
        if (isOccupied) {
          const pole = new THREE.Mesh(monitorPoleGeo, monitorPoleMat)
          pole.position.set(0.8, 0.9, -0.8)
          bedGroup.add(pole)

          const screen = new THREE.Mesh(monitorScreenGeo, dept.status === 'critical' ? monitorCritMat : monitorOkMat)
          screen.position.set(0.8, 1.7, -0.8)
          screen.rotation.y = -Math.PI / 4
          bedGroup.add(screen)
        }

        parent.add(bedGroup)
        bedIndex++
      }
    }
  }

  /**
   * Generates realistic 3D CT/MRI scanners and diagnostic consoles for Radiology.
   */
  private populateRadiologyEquipment(parent: THREE.Group) {
    // 1. CT Scanner Gantry (Donut shape)
    const ctGroup = new THREE.Group()
    ctGroup.position.set(-4, 0.4, -2)

    // Base pedestal
    const pedestalGeo = new THREE.BoxGeometry(3.6, 0.5, 3.2)
    const whitePlasticMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.1 })
    const pedestal = new THREE.Mesh(pedestalGeo, whitePlasticMat)
    pedestal.position.y = 0.25
    ctGroup.add(pedestal)

    // Scanner Ring (Torus)
    const ringGeo = new THREE.TorusGeometry(1.6, 0.6, 16, 32)
    const ringMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.1, metalness: 0.3 })
    const ring = new THREE.Mesh(ringGeo, ringMat)
    ring.position.set(0, 2.0, 0)
    ctGroup.add(ring)

    // Patient Examination Couch
    const couchGeo = new THREE.BoxGeometry(1.2, 0.4, 4.0)
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
    const couch = new THREE.Mesh(couchGeo, couchMat)
    couch.position.set(0, 1.1, 1.2)
    ctGroup.add(couch)

    parent.add(ctGroup)

    // 2. MRI Unit
    const mriGroup = new THREE.Group()
    mriGroup.position.set(4, 0.4, -2)

    const mriTunnelGeo = new THREE.CylinderGeometry(1.8, 1.8, 3.8, 24)
    mriTunnelGeo.rotateX(Math.PI / 2)
    const mriTunnel = new THREE.Mesh(mriTunnelGeo, whitePlasticMat)
    mriTunnel.position.y = 2.0
    mriGroup.add(mriTunnel)

    const mriCouch = new THREE.Mesh(couchGeo, couchMat)
    mriCouch.position.set(0, 1.1, 1.2)
    mriGroup.add(mriCouch)

    parent.add(mriGroup)

    // 3. Radiology Technician Console Station
    const deskGeo = new THREE.BoxGeometry(3.0, 1.0, 1.2)
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 })
    const desk = new THREE.Mesh(deskGeo, deskMat)
    desk.position.set(0, 0.9, 4.0)
    parent.add(desk)

    // Triple Display monitors
    const screenGeo = new THREE.BoxGeometry(0.7, 0.5, 0.08)
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    for (let i = -1; i <= 1; i++) {
      const mon = new THREE.Mesh(screenGeo, screenMat)
      mon.position.set(i * 0.85, 1.7, 4.0)
      parent.add(mon)
    }
  }
}
