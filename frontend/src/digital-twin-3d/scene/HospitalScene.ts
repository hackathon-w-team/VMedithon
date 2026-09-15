import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Hospital3DState } from '../adapters/types'
import { BedsBuilder } from './BedsBuilder'
import { DepartmentMeshBuilder } from './DepartmentMeshBuilder'
import { PatientFlowRenderer } from './PatientFlowRenderer'
import { PatientQueueBuilder } from './PatientQueueBuilder'
import { RippleEffectRenderer } from './RippleEffectRenderer'
import { StaffBuilder } from './StaffBuilder'

export type CameraPreset = 'overview' | 'emergency' | 'icu' | 'ward' | 'radiology' | 'top-down'

export class HospitalScene {
  private container: HTMLElement
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private renderer: THREE.WebGLRenderer
  private controls: OrbitControls
  private animationFrameId: number | null = null
  private clock = new THREE.Clock()

  // Sub-builders
  private deptMeshBuilder = new DepartmentMeshBuilder()
  private bedsBuilder = new BedsBuilder()
  private staffBuilder = new StaffBuilder()
  private queueBuilder = new PatientQueueBuilder()
  private flowRenderer = new PatientFlowRenderer()
  private rippleRenderer = new RippleEffectRenderer()

  // Scene object groups
  private campusGroup = new THREE.Group()
  private departmentsGroup = new THREE.Group()
  private resourcesGroup = new THREE.Group()
  private staffGroup = new THREE.Group()
  private queuesGroup = new THREE.Group()

  // Interaction
  private raycaster = new THREE.Raycaster()
  private mouse = new THREE.Vector2()
  private onSelectDeptCallback?: (deptId: string | null) => void
  private selectedDeptId: string | null = null
  private currentState: Hospital3DState | null = null

  // Camera Animation Tweening
  private targetCameraPos: THREE.Vector3 | null = null
  private targetLookAt: THREE.Vector3 | null = null
  private isCameraTransitioning = false
  private resizeObserver: ResizeObserver | null = null

  constructor(container: HTMLElement, onSelectDept?: (deptId: string | null) => void) {
    this.container = container
    this.onSelectDeptCallback = onSelectDept

    // 1. Scene setup
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x06090f) // Command center dark slate
    this.scene.fog = new THREE.FogExp2(0x06090f, 0.007)

    // 2. Camera setup
    const width = container.clientWidth || window.innerWidth || 800
    const height = container.clientHeight || Math.max(window.innerHeight - 120, 500)
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 1000)
    this.camera.position.set(0, 65, 80)

    // 3. Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setSize(width, height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    container.appendChild(this.renderer.domElement)

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.maxPolarAngle = Math.PI / 2 - 0.05 // don't go below floor
    this.controls.minDistance = 15
    this.controls.maxDistance = 220
    this.controls.target.set(0, 0, 0)

    // 5. Lighting
    this.setupLighting()

    // 6. Add sub-groups
    this.scene.add(this.campusGroup)
    this.scene.add(this.departmentsGroup)
    this.scene.add(this.resourcesGroup)
    this.scene.add(this.staffGroup)
    this.scene.add(this.queuesGroup)
    this.scene.add(this.flowRenderer.getGroup())
    this.scene.add(this.rippleRenderer.getGroup())

    // Initial Campus Base
    this.campusGroup.add(this.deptMeshBuilder.buildCampusBase())

    // 7. Event Listeners
    this.bindEvents()

    // 8. Start loop
    this.animate()
  }

  private setupLighting() {
    // Ambient command room glow
    const ambient = new THREE.AmbientLight(0x475569, 1.4)
    this.scene.add(ambient)

    // Main Overhead Directional Light
    const mainLight = new THREE.DirectionalLight(0xffffff, 2.2)
    mainLight.position.set(40, 80, 50)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 10
    mainLight.shadow.camera.far = 250
    mainLight.shadow.camera.left = -90
    mainLight.shadow.camera.right = 90
    mainLight.shadow.camera.top = 90
    mainLight.shadow.camera.bottom = -90
    this.scene.add(mainLight)

    // Rim / Accent Cyan Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.9)
    rimLight.position.set(-50, 40, -50)
    this.scene.add(rimLight)

    // Soft Blue Ground Upward Bounce
    const hemiLight = new THREE.HemisphereLight(0x1e293b, 0x090d16, 0.8)
    this.scene.add(hemiLight)
  }

  private bindEvents() {
    this.onResize = this.onResize.bind(this)
    this.onPointerDown = this.onPointerDown.bind(this)

    window.addEventListener('resize', this.onResize)
    this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown)

    if (typeof ResizeObserver !== 'undefined' && this.container) {
      this.resizeObserver = new ResizeObserver(() => {
        this.onResize()
      })
      this.resizeObserver.observe(this.container)
    }
  }

  private onResize() {
    if (!this.container) return
    const width = this.container.clientWidth || window.innerWidth || 800
    const height = this.container.clientHeight || Math.max(window.innerHeight - 120, 500)
    if (width > 0 && height > 0) {
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
      this.renderer.setSize(width, height)
    }
  }

  private onPointerDown(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

    this.raycaster.setFromCamera(this.mouse, this.camera)
    const intersects = this.raycaster.intersectObjects(this.departmentsGroup.children, true)

    if (intersects.length > 0) {
      // Find parent department group
      let curr: THREE.Object3D | null = intersects[0].object
      while (curr && !curr.userData?.departmentId && curr.parent) {
        curr = curr.parent
      }

      if (curr && curr.userData?.departmentId) {
        const deptId = curr.userData.departmentId
        this.selectedDeptId = deptId
        if (this.onSelectDeptCallback) {
          this.onSelectDeptCallback(deptId)
        }
        this.focusDepartment(deptId)
        return
      }
    }
  }

  public updateState(state: Hospital3DState, selectedDeptId: string | null = null) {
    this.currentState = state
    this.selectedDeptId = selectedDeptId

    // Clear previous dynamic meshes
    this.deptMeshBuilder.dispose()
    this.clearGroup(this.departmentsGroup)
    this.clearGroup(this.resourcesGroup)
    this.clearGroup(this.staffGroup)
    this.clearGroup(this.queuesGroup)

    // 1. Rebuild department zones
    state.departments.forEach((dept) => {
      const isSelected = dept.id === selectedDeptId
      const deptMesh = this.deptMeshBuilder.buildDepartment(dept, isSelected)
      this.departmentsGroup.add(deptMesh)

      // 2. Beds and diagnostic equipment
      const resourcesMesh = this.bedsBuilder.buildResources(dept)
      this.resourcesGroup.add(resourcesMesh)

      // 3. Medical staff figures
      const staffMesh = this.staffBuilder.buildStaff(dept)
      this.staffGroup.add(staffMesh)

      // 4. Waiting patient lounge & queues
      const queueMesh = this.queueBuilder.buildQueue(dept)
      this.queuesGroup.add(queueMesh)
    })

    // 4. Update dynamic patient flows
    this.flowRenderer.updateFlows(state.flows, state.departments)

    // 5. Update ripple effect animations
    this.rippleRenderer.updateRipples(state.rippleEffects, state.departments)
  }

  private clearGroup(group: THREE.Group) {
    while (group.children.length > 0) {
      const child = group.children[0]
      group.remove(child)
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose()
        if (Array.isArray(child.material)) child.material.forEach((m) => m.dispose())
        else child.material?.dispose()
      }
    }
  }

  public setCameraPreset(preset: CameraPreset) {
    this.isCameraTransitioning = true

    switch (preset) {
      case 'overview':
        this.targetCameraPos = new THREE.Vector3(0, 70, 85)
        this.targetLookAt = new THREE.Vector3(0, 0, 0)
        break
      case 'emergency':
        this.focusDepartment('emergency')
        break
      case 'icu':
        this.focusDepartment('icu')
        break
      case 'ward':
        this.focusDepartment('general_ward')
        break
      case 'radiology':
        this.focusDepartment('radiology')
        break
      case 'top-down':
        this.targetCameraPos = new THREE.Vector3(0, 110, 0.5)
        this.targetLookAt = new THREE.Vector3(0, 0, 0)
        break
    }
  }

  public focusDepartment(deptId: string) {
    if (!this.currentState) return
    const dept = this.currentState.departments.find((d) => d.id === deptId)
    if (!dept) return

    this.isCameraTransitioning = true
    this.targetLookAt = new THREE.Vector3(dept.gridX, 1.5, dept.gridZ)
    this.targetCameraPos = new THREE.Vector3(dept.gridX, 28, dept.gridZ + 32)
  }

  private animate = () => {
    this.animationFrameId = requestAnimationFrame(this.animate)

    const delta = this.clock.getDelta()

    // Camera tweening
    if (this.isCameraTransitioning && this.targetCameraPos && this.targetLookAt) {
      this.camera.position.lerp(this.targetCameraPos, 0.08)
      this.controls.target.lerp(this.targetLookAt, 0.08)

      if (
        this.camera.position.distanceTo(this.targetCameraPos) < 0.2 &&
        this.controls.target.distanceTo(this.targetLookAt) < 0.2
      ) {
        this.isCameraTransitioning = false
      }
    }

    // Update controls
    this.controls.update()

    // Animate flows and ripples
    this.flowRenderer.animate(delta)
    this.rippleRenderer.animate(delta)

    // Render
    this.renderer.render(this.scene, this.camera)
  }

  public dispose() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId)
    }

    window.removeEventListener('resize', this.onResize)
    this.renderer.domElement.removeEventListener('pointerdown', this.onPointerDown)

    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }

    this.deptMeshBuilder.dispose()
    this.flowRenderer.dispose()
    this.rippleRenderer.dispose()

    this.controls.dispose()
    this.renderer.dispose()

    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement)
    }
  }
}
