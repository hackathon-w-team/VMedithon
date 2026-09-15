import * as THREE from 'three'
import type { Department3D, PatientFlow3D } from '../adapters/types'

interface ActiveFlow {
  curve: THREE.CatmullRomCurve3
  particles: THREE.Mesh[]
  speeds: number[]
  offsets: number[]
  color: THREE.Color
  tubeMesh: THREE.Mesh
}

export class PatientFlowRenderer {
  private activeFlows: ActiveFlow[] = []
  private flowGroup = new THREE.Group()

  constructor() {
    this.flowGroup.name = 'patient-flows'
  }

  public getGroup(): THREE.Group {
    return this.flowGroup
  }

  public updateFlows(flows: PatientFlow3D[], departments: Department3D[]) {
    // Clear previous flows
    while (this.flowGroup.children.length > 0) {
      const child = this.flowGroup.children[0]
      this.flowGroup.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose())
        } else {
          child.material?.dispose()
        }
      }
    }
    this.activeFlows = []

    const deptMap = new Map<string, Department3D>()
    departments.forEach((d) => deptMap.set(d.id, d))

    flows.forEach((flow) => {
      const from = deptMap.get(flow.fromDeptId)
      const to = deptMap.get(flow.toDeptId)
      if (!from || !to) return

      // Compute 3D path coordinates between department entrances
      const startPt = new THREE.Vector3(from.gridX, 1.2, from.gridZ + from.depth / 2 + 2)
      const midPt = new THREE.Vector3(
        (from.gridX + to.gridX) / 2,
        3.5, // arch upward over corridors
        (from.gridZ + to.gridZ) / 2,
      )
      const endPt = new THREE.Vector3(to.gridX, 1.2, to.gridZ + to.depth / 2 + 2)

      const curve = new THREE.CatmullRomCurve3([startPt, midPt, endPt])

      // Guide Tube (subtle glowing glass tube)
      const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.12, 8, false)
      const isCongested = flow.status === 'congested'
      const flowColor = isCongested ? new THREE.Color(0xf59e0b) : new THREE.Color(0x38bdf8)

      const tubeMat = new THREE.MeshBasicMaterial({
        color: flowColor,
        transparent: true,
        opacity: 0.25,
      })
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat)
      this.flowGroup.add(tubeMesh)

      // Dynamic glowing particles along curve
      const particleCount = Math.min(Math.max(flow.volume, 4), 12)
      const particles: THREE.Mesh[] = []
      const speeds: number[] = []
      const offsets: number[] = []

      const particleGeo = new THREE.SphereGeometry(0.22, 8, 8)
      const particleMat = new THREE.MeshBasicMaterial({
        color: isCongested ? 0xef4444 : 0x38bdf8,
      })

      for (let i = 0; i < particleCount; i++) {
        const particle = new THREE.Mesh(particleGeo, particleMat)
        this.flowGroup.add(particle)
        particles.push(particle)

        offsets.push(i / particleCount)
        speeds.push(0.12 + (flow.volume / 20) * 0.1) // speed corresponds to volume
      }

      this.activeFlows.push({
        curve,
        particles,
        speeds,
        offsets,
        color: flowColor,
        tubeMesh,
      })
    })
  }

  /**
   * Advances flow particles on each frame of the render loop.
   */
  public animate(deltaTime: number) {
    this.activeFlows.forEach((f) => {
      f.particles.forEach((p, idx) => {
        f.offsets[idx] = (f.offsets[idx] + f.speeds[idx] * deltaTime) % 1.0
        const pt = f.curve.getPointAt(f.offsets[idx])
        p.position.copy(pt)
      })
    })
  }

  public dispose() {
    this.updateFlows([], [])
  }
}
