import * as THREE from 'three'
import type { Department3D } from '../adapters/types'
import { drawRoundRect } from '../utils/canvasUtils'

// Must match the grid anchors in hospital3DAdapter.ts
const ZONE_SPACING_X = 36
const ZONE_SPACING_Z = 32

export class DepartmentMeshBuilder {
  private texturesToDispose: THREE.Texture[] = []

  public dispose() {
    this.texturesToDispose.forEach((t) => t.dispose())
    this.texturesToDispose = []
  }

  /**
   * Builds the department structure: floor, glass walls, corner pillars,
   * status perimeter light, and high-res floating canvas signboard.
   */
  public buildDepartment(dept: Department3D, isSelected: boolean): THREE.Group {
    const group = new THREE.Group()
    group.name = `dept-${dept.id}`
    group.userData = { departmentId: dept.id, isDepartment: true }

    const { width, depth, gridX, gridZ, status, color } = dept
    const wallHeight = 3.8

    // 1. Status color mapping
    let statusHex = 0x10b981 // ok - emerald
    let glowHex = 0x34d399
    if (status === 'critical') {
      statusHex = 0xef4444 // critical - red
      glowHex = 0xf87171
    } else if (status === 'warning') {
      statusHex = 0xf59e0b // warning - amber
      glowHex = 0xfbbf24
    }

    // 2. Department Floor Slab
    const floorGeo = new THREE.BoxGeometry(width, 0.4, depth)
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // dark slate hospital floor
      roughness: 0.3,
      metalness: 0.1,
    })
    const floorMesh = new THREE.Mesh(floorGeo, floorMat)
    floorMesh.position.set(0, 0.2, 0)
    floorMesh.receiveShadow = true
    group.add(floorMesh)

    // Inner linoleum accent tile
    const accentGeo = new THREE.PlaneGeometry(width - 2, depth - 2)
    accentGeo.rotateX(-Math.PI / 2)
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.05,
    })
    const accentMesh = new THREE.Mesh(accentGeo, accentMat)
    accentMesh.position.set(0, 0.41, 0)
    accentMesh.receiveShadow = true
    group.add(accentMesh)

    // 3. Perimeter Status Glow Border
    const borderGeo = new THREE.BoxGeometry(width + 0.3, 0.1, depth + 0.3)
    const borderMat = new THREE.MeshBasicMaterial({
      color: isSelected ? 0x38bdf8 : statusHex,
    })
    const borderMesh = new THREE.Mesh(borderGeo, borderMat)
    borderMesh.position.set(0, 0.42, 0)
    group.add(borderMesh)

    // 4. Corner Pillars
    const pillarGeo = new THREE.BoxGeometry(0.6, wallHeight, 0.6)
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.2,
      metalness: 0.8,
    })
    const corners = [
      [-width / 2 + 0.3, -depth / 2 + 0.3],
      [width / 2 - 0.3, -depth / 2 + 0.3],
      [-width / 2 + 0.3, depth / 2 - 0.3],
      [width / 2 - 0.3, depth / 2 - 0.3],
    ]
    corners.forEach(([cx, cz]) => {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat)
      pillar.position.set(cx, wallHeight / 2 + 0.4, cz)
      pillar.castShadow = true
      group.add(pillar)
    })

    // 5. Architectural Glass Walls with Open Entrance (using safe MeshStandardMaterial)
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.15,
      metalness: 0.1,
    })

    // Back wall
    const backWallGeo = new THREE.BoxGeometry(width - 1.2, wallHeight, 0.15)
    const backWall = new THREE.Mesh(backWallGeo, glassMat)
    backWall.position.set(0, wallHeight / 2 + 0.4, -depth / 2 + 0.3)
    group.add(backWall)

    // Left wall
    const leftWallGeo = new THREE.BoxGeometry(0.15, wallHeight, depth - 1.2)
    const leftWall = new THREE.Mesh(leftWallGeo, glassMat)
    leftWall.position.set(-width / 2 + 0.3, wallHeight / 2 + 0.4, 0)
    group.add(leftWall)

    // Right wall
    const rightWall = new THREE.Mesh(leftWallGeo, glassMat)
    rightWall.position.set(width / 2 - 0.3, wallHeight / 2 + 0.4, 0)
    group.add(rightWall)

    // Front wall with door opening (split in 2 wings)
    const doorGap = 7.0
    const frontWingWidth = (width - 1.2 - doorGap) / 2
    if (frontWingWidth > 0.5) {
      const frontWingGeo = new THREE.BoxGeometry(frontWingWidth, wallHeight, 0.15)
      const frontLeft = new THREE.Mesh(frontWingGeo, glassMat)
      frontLeft.position.set(-doorGap / 2 - frontWingWidth / 2, wallHeight / 2 + 0.4, depth / 2 - 0.3)
      group.add(frontLeft)

      const frontRight = new THREE.Mesh(frontWingGeo, glassMat)
      frontRight.position.set(doorGap / 2 + frontWingWidth / 2, wallHeight / 2 + 0.4, depth / 2 - 0.3)
      group.add(frontRight)
    }

    // 6. Floating Department Billboard / Signboard
    const signboard = this.createSignboard(dept, isSelected)
    signboard.position.set(0, wallHeight + 2.2, depth / 2 - 0.3)
    group.add(signboard)

    // Set world position of whole zone
    group.position.set(gridX, 0, gridZ)

    return group
  }

  /**
   * Generates a crisp canvas signboard texture with title, status badge,
   * occupancy percentage, and wait time.
   */
  private createSignboard(dept: Department3D, isSelected: boolean): THREE.Mesh {
    const canvas = document.createElement('canvas')
    canvas.width = 512
    canvas.height = 192
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      const fallbackGeo = new THREE.PlaneGeometry(6.4, 2.4)
      return new THREE.Mesh(fallbackGeo, new THREE.MeshBasicMaterial({ color: 0x1e293b }))
    }

    // Background card
    ctx.fillStyle = isSelected ? '#1e293b' : '#0f172a'
    drawRoundRect(ctx, 8, 8, 496, 176, 16)
    ctx.fill()

    // Border
    let statusColor = '#10b981'
    if (dept.status === 'critical') statusColor = '#ef4444'
    else if (dept.status === 'warning') statusColor = '#f59e0b'

    ctx.lineWidth = isSelected ? 8 : 4
    ctx.strokeStyle = isSelected ? '#38bdf8' : statusColor
    ctx.stroke()

    // Department Header Strip
    ctx.fillStyle = dept.color
    drawRoundRect(ctx, 16, 16, 480, 48, 8)
    ctx.fill()

    // Department Title Text
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 26px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(dept.name.toUpperCase(), 256, 50)

    // Status Badge
    ctx.fillStyle = statusColor
    drawRoundRect(ctx, 24, 76, 120, 32, 6)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 18px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(dept.status.toUpperCase(), 84, 98)

    // Metrics Row
    ctx.fillStyle = '#cbd5e1'
    ctx.font = '18px Inter, sans-serif'
    ctx.textAlign = 'left'

    // Beds / Occupancy
    if (dept.bedsTotal > 0) {
      ctx.fillText(`Beds: ${dept.bedsOccupied}/${dept.bedsTotal} (${dept.bedOccupancyPct}%)`, 160, 98)
    } else {
      ctx.fillText(`Throughput: Diagnostic Unit`, 160, 98)
    }

    // Queue & Wait Time
    ctx.fillStyle = dept.patientsWaiting > 10 ? '#f87171' : '#94a3b8'
    ctx.fillText(`Waiting: ${dept.patientsWaiting} pts`, 24, 145)

    ctx.fillStyle = dept.predictedWaitMin >= 45 ? '#f87171' : '#38bdf8'
    ctx.font = 'bold 20px Inter, sans-serif'
    ctx.fillText(`Wait: ${dept.predictedWaitMin} min`, 220, 145)

    // Staff assigned
    ctx.fillStyle = '#94a3b8'
    ctx.font = '16px Inter, sans-serif'
    ctx.fillText(`Staff: ${dept.staffAssigned}/${dept.staffTotal}`, 390, 145)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    this.texturesToDispose.push(texture)

    const signGeo = new THREE.PlaneGeometry(6.4, 2.4)
    const signMat = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide,
      transparent: true,
    })

    return new THREE.Mesh(signGeo, signMat)
  }

  /**
   * Builds the foundational hospital campus ground, roadway, and ambulance bays.
   */
  public buildCampusBase(): THREE.Group {
    const group = new THREE.Group()

    // 1. Main Ground Slab
    const groundGeo = new THREE.PlaneGeometry(160, 140)
    groundGeo.rotateX(-Math.PI / 2)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x090d16, // deep command slate
      roughness: 0.8,
      metalness: 0.1,
    })
    const groundMesh = new THREE.Mesh(groundGeo, groundMat)
    groundMesh.position.y = -0.05
    groundMesh.receiveShadow = true
    group.add(groundMesh)

    // 2. Subtle Architectural Grid Overlay
    const grid = new THREE.GridHelper(160, 40, 0x1e293b, 0x131d2e)
    grid.position.y = 0.01
    group.add(grid)

    // 3. Central Corridor Walkway connecting all zones
    const walkwayGeo = new THREE.PlaneGeometry(12, 100)
    walkwayGeo.rotateX(-Math.PI / 2)
    const walkwayMat = new THREE.MeshStandardMaterial({
      color: 0x172236,
      roughness: 0.5,
    })
    const walkwayZ = new THREE.Mesh(walkwayGeo, walkwayMat)
    walkwayZ.position.y = 0.05
    group.add(walkwayZ)

    const walkwayX = new THREE.Mesh(new THREE.PlaneGeometry(120, 10).rotateX(-Math.PI / 2), walkwayMat)
    walkwayX.position.y = 0.06
    group.add(walkwayX)

    // 4. Ambulance Bay Marker near Emergency (at front-left)
    const ambuGeo = new THREE.PlaneGeometry(16, 12)
    ambuGeo.rotateX(-Math.PI / 2)
    const ambuMat = new THREE.MeshStandardMaterial({
      color: 0x3f1818,
      roughness: 0.5,
    })
    const ambuMesh = new THREE.Mesh(ambuGeo, ambuMat)
    ambuMesh.position.set(-ZONE_SPACING_X / 2, 0.08, ZONE_SPACING_Z / 2 + 16)
    group.add(ambuMesh)

    return group
  }
}
