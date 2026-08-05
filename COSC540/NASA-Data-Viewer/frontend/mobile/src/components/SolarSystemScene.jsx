import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

function createCanvasLabel(text, accentColor = '#4da6ff') {
  const canvas = document.createElement('canvas')
  canvas.width = 640
  canvas.height = 160

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  const x = 36
  const y = 30
  const w = 568
  const h = 100
  const r = 24

  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fillStyle = 'rgba(10, 15, 30, 0.85)'
  ctx.fill()

  ctx.strokeStyle = accentColor
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.font = '600 28px Inter, Arial, sans-serif'
  ctx.fillStyle = '#e6f0ff'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  })

  const sprite = new THREE.Sprite(material)
  sprite.scale.set(80, 20, 1)
  return sprite
}

function getLabelText(selectedNotableEvent) {
  if (!selectedNotableEvent) return ''
  return `${selectedNotableEvent.badge}: ${selectedNotableEvent.tag}`
}

function quadraticBezierPoint(start, control, end, t) {
  const oneMinusT = 1 - t
  return new THREE.Vector3(
    oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
    oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y,
    oneMinusT * oneMinusT * start.z + 2 * oneMinusT * t * control.z + t * t * end.z
  )
}

function SolarSystemScene({ activeViewEnabled = true, selectedNotableEvent = null }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x020817)

    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.1, 5000)
    camera.position.set(0, 290, 860)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.enablePan = true
    controls.enableZoom = true
    controls.target.set(0, 10, 0)
    controls.minDistance = 180
    controls.maxDistance = 1600
    controls.update()

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65)
    scene.add(ambientLight)

    const sunLight = new THREE.PointLight(0xffffff, 1.7, 0, 2)
    scene.add(sunLight)

    const textureLoader = new THREE.TextureLoader()
    const safeLoad = (path) => {
      try {
        return textureLoader.load(path)
      } catch {
        return null
      }
    }

    const sunTexture = safeLoad('/textures/sun.jpg')
    const earthTexture = safeLoad('/textures/earth.jpg')
    const moonTexture = safeLoad('/textures/moon.jpg')
    const marsTexture = safeLoad('/textures/mars.jpg')
    const jupiterTexture = safeLoad('/textures/jupiter.jpg')
    const saturnTexture = safeLoad('/textures/saturn.jpg')
    const saturnRingTexture = safeLoad('/textures/saturn_ring.png')

    function createStars(count = 2600) {
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(count * 3)

      for (let i = 0; i < count; i += 1) {
        const idx = i * 3
        positions[idx] = (Math.random() - 0.5) * 2200
        positions[idx + 1] = (Math.random() - 0.5) * 2200
        positions[idx + 2] = (Math.random() - 0.5) * 2200
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

      const material = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 1,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.85,
      })

      const stars = new THREE.Points(geometry, material)
      scene.add(stars)
      return stars
    }

    const stars = createStars()

    const orbitMaterial = new THREE.LineBasicMaterial({
      color: 0x7eb6ff,
      transparent: true,
      opacity: 0.55,
    })

    function createOrbit(radius) {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2)
      const points = curve.getPoints(192).map((p) => new THREE.Vector3(p.x, 0, p.y))
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const line = new THREE.LineLoop(geometry, orbitMaterial)
      scene.add(line)
    }

    ;[90, 140, 195, 265, 360, 470].forEach(createOrbit)

    const sunMaterial = new THREE.MeshStandardMaterial({
      map: sunTexture,
      color: sunTexture ? 0xffffff : 0xffb347,
      emissive: 0xffffff,
      emissiveMap: sunTexture || null,
      emissiveIntensity: 1.2,
    })
    const sun = new THREE.Mesh(new THREE.SphereGeometry(42, 48, 48), sunMaterial)
    scene.add(sun)

    const sunGlow = new THREE.Mesh(
      new THREE.SphereGeometry(60, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffcc66, transparent: true, opacity: 0.12 })
    )
    scene.add(sunGlow)

    function createPlanet(radius, texture, orbitRadius, angle, fallbackColor) {
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 32, 32),
        new THREE.MeshStandardMaterial({
          map: texture,
          color: texture ? 0xffffff : fallbackColor,
          roughness: 0.9,
          metalness: 0,
          emissive: 0x222222,
          emissiveIntensity: 0.28,
        })
      )
      mesh.position.set(Math.cos(angle) * orbitRadius, 0, Math.sin(angle) * orbitRadius)
      scene.add(mesh)
      return mesh
    }

    createPlanet(5, moonTexture, 90, 1.5, 0xd6d6d6)
    createPlanet(8, marsTexture, 140, -0.8, 0xb4553d)
    const earth = createPlanet(9, earthTexture, 195, 0.95, 0x4c80ff)
    const mars = createPlanet(6, marsTexture, 265, -1.7, 0xc96b4f)
    const jupiter = createPlanet(18, jupiterTexture, 360, -0.65, 0xd8b085)
    const saturn = createPlanet(12, saturnTexture, 470, 1.35, 0xdab47c)

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 24, 24),
      new THREE.MeshStandardMaterial({
        map: moonTexture,
        color: moonTexture ? 0xffffff : 0xd4d4d4,
        roughness: 1,
        metalness: 0,
      })
    )
    scene.add(moon)

    const earthAtmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(10.3, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x4da6ff,
        transparent: true,
        opacity: 0.18,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
    )
    earth.add(earthAtmosphere)

    const magnetosphere = new THREE.Mesh(
      new THREE.SphereGeometry(14.5, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x66ffb3,
        transparent: true,
        opacity: 0.08,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      })
    )
    magnetosphere.scale.set(1.2, 0.9, 1.5)
    earth.add(magnetosphere)

    if (saturnRingTexture) {
      const saturnRing = new THREE.Mesh(
        new THREE.RingGeometry(18, 30, 128),
        new THREE.MeshBasicMaterial({
          map: saturnRingTexture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 1,
          color: 0xffffff,
          depthWrite: false,
        })
      )
      saturnRing.rotation.x = Math.PI / 2.45
      saturn.add(saturnRing)
    }

    const solarWindCount = 1200
    const solarWindPositions = new Float32Array(solarWindCount * 3)
    const solarWindVelocity = new Float32Array(solarWindCount * 3)

    function resetWindParticle(i) {
      const idx = i * 3
      const direction = new THREE.Vector3(
        THREE.MathUtils.randFloatSpread(2),
        THREE.MathUtils.randFloatSpread(2),
        THREE.MathUtils.randFloatSpread(2)
      ).normalize()
      const startRadius = THREE.MathUtils.randFloat(50, 62)
      const speed = THREE.MathUtils.randFloat(0.35, 0.85)

      solarWindPositions[idx] = direction.x * startRadius
      solarWindPositions[idx + 1] = direction.y * startRadius
      solarWindPositions[idx + 2] = direction.z * startRadius
      solarWindVelocity[idx] = direction.x * speed
      solarWindVelocity[idx + 1] = direction.y * speed
      solarWindVelocity[idx + 2] = direction.z * speed
    }

    for (let i = 0; i < solarWindCount; i += 1) resetWindParticle(i)

    const solarWind = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        color: 0x9fe7ff,
        size: 1.2,
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      })
    )
    solarWind.geometry.setAttribute('position', new THREE.BufferAttribute(solarWindPositions, 3))
    scene.add(solarWind)

    const cmeCount = 44
    const cmePositions = new Float32Array(cmeCount * 3)
    const cmeProgress = new Float32Array(cmeCount)
    const cmeOffset = new Float32Array(cmeCount * 2)
    for (let i = 0; i < cmeCount; i += 1) {
      cmeProgress[i] = Math.random()
      cmeOffset[i * 2] = THREE.MathUtils.randFloatSpread(10)
      cmeOffset[i * 2 + 1] = THREE.MathUtils.randFloatSpread(10)
    }
    const cmeParticles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        color: 0xffb46a,
        size: 2.1,
        transparent: true,
        opacity: 0.52,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    cmeParticles.geometry.setAttribute('position', new THREE.BufferAttribute(cmePositions, 3))
    scene.add(cmeParticles)

    const deflectCount = 28
    const deflectPositions = new Float32Array(deflectCount * 3)
    const deflectProgress = new Float32Array(deflectCount)
    const deflectHeight = new Float32Array(deflectCount)
    const deflectSide = new Float32Array(deflectCount)
    for (let i = 0; i < deflectCount; i += 1) {
      deflectProgress[i] = Math.random()
      deflectHeight[i] = THREE.MathUtils.randFloatSpread(10)
      deflectSide[i] = Math.random() > 0.5 ? 1 : -1
    }
    const deflectParticles = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({
        color: 0x66ff99,
        size: 2.0,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    )
    deflectParticles.geometry.setAttribute('position', new THREE.BufferAttribute(deflectPositions, 3))
    scene.add(deflectParticles)

    const flareCurve = new THREE.Group()
    for (let i = 0; i < 6; i += 1) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(30 + i * 8, 26 + i * 8, -6 + i * 3),
        new THREE.Vector3(58 + i * 12, 44 + i * 6, -12 + i * 7)
      )
      const points = curve.getPoints(54)
      const geometry = new THREE.BufferGeometry().setFromPoints(points)
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({
          color: i % 2 === 0 ? 0xffd966 : 0xff8a3d,
          transparent: true,
          opacity: 0.92,
        })
      )
      flareCurve.add(line)
    }
    flareCurve.position.set(18, 10, 0)
    flareCurve.visible = false
    scene.add(flareCurve)

    const flareHalo = new THREE.Mesh(
      new THREE.TorusGeometry(22, 1.4, 16, 100, Math.PI * 0.9),
      new THREE.MeshBasicMaterial({
        color: 0xffc857,
        transparent: true,
        opacity: 0.72,
      })
    )
    flareHalo.position.set(18, 10, 0)
    flareHalo.rotation.z = Math.PI / 3.8
    flareHalo.visible = false
    scene.add(flareHalo)

    const neoGroup = new THREE.Group()
    const neoBody = new THREE.Mesh(
      new THREE.IcosahedronGeometry(5.2, 1),
      new THREE.MeshStandardMaterial({
        color: 0xbfb39a,
        roughness: 1,
        metalness: 0,
        emissive: 0x2b2112,
        emissiveIntensity: 0.3,
      })
    )
    neoGroup.add(neoBody)

    const neoGlow = new THREE.Mesh(
      new THREE.SphereGeometry(6.6, 20, 20),
      new THREE.MeshBasicMaterial({
        color: 0xffd7a8,
        transparent: true,
        opacity: 0.08,
      })
    )
    neoGroup.add(neoGlow)

    const neoTrail = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffd7a8, transparent: true, opacity: 0.72 })
    )
    scene.add(neoTrail)
    neoGroup.visible = false
    neoTrail.visible = false
    scene.add(neoGroup)

    const labelText = activeViewEnabled && selectedNotableEvent ? getLabelText(selectedNotableEvent) : ''
    const labelAccent = selectedNotableEvent?.type === 'cme'
      ? '#ffb46a'
      : selectedNotableEvent?.type === 'flare'
        ? '#ffcc66'
        : '#d8c19f'
    const eventLabel = labelText ? createCanvasLabel(labelText, labelAccent) : null
    if (eventLabel) scene.add(eventLabel)

    let animationId = 0
    const clock = new THREE.Clock()

    function updateSolarWind() {
      const pos = solarWind.geometry.attributes.position.array
      for (let i = 0; i < solarWindCount; i += 1) {
        const idx = i * 3
        pos[idx] += solarWindVelocity[idx]
        pos[idx + 1] += solarWindVelocity[idx + 1]
        pos[idx + 2] += solarWindVelocity[idx + 2]
        const dist = Math.sqrt(pos[idx] ** 2 + pos[idx + 1] ** 2 + pos[idx + 2] ** 2)
        if (dist > 900) resetWindParticle(i)
      }
      solarWind.geometry.attributes.position.needsUpdate = true
    }

    function updateCME(sunPos, earthPos) {
      const pos = cmeParticles.geometry.attributes.position.array
      const dir = earthPos.clone().sub(sunPos)
      const dist = dir.length()
      dir.normalize()
      const stopDist = dist - 16

      for (let i = 0; i < cmeCount; i += 1) {
        cmeProgress[i] += 0.01 + Math.random() * 0.003
        if (cmeProgress[i] > 1) cmeProgress[i] = 0
        const idx = i * 3
        const travel = Math.min(cmeProgress[i] * dist, stopDist)
        const point = sunPos.clone().add(dir.clone().multiplyScalar(travel))
        point.x += cmeOffset[i * 2]
        point.y += cmeOffset[i * 2 + 1]
        pos[idx] = point.x
        pos[idx + 1] = point.y
        pos[idx + 2] = point.z
      }
      cmeParticles.geometry.attributes.position.needsUpdate = true

      const defPos = deflectParticles.geometry.attributes.position.array
      const earthToSun = sunPos.clone().sub(earthPos).normalize()
      let sideA = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), earthToSun)
      if (sideA.lengthSq() < 0.0001) sideA = new THREE.Vector3(1, 0, 0)
      sideA.normalize()
      const sideB = new THREE.Vector3().crossVectors(earthToSun, sideA).normalize()

      for (let i = 0; i < deflectCount; i += 1) {
        deflectProgress[i] += 0.013 + Math.random() * 0.004
        if (deflectProgress[i] > 1) deflectProgress[i] = 0
        const idx = i * 3
        const distance = 18 + deflectProgress[i] * 48
        const sideDistance = deflectProgress[i] * 18 * deflectSide[i]
        const point = earthPos.clone()
          .add(earthToSun.clone().multiplyScalar(distance))
          .add(sideA.clone().multiplyScalar(sideDistance))
          .add(sideB.clone().multiplyScalar(deflectHeight[i]))
        defPos[idx] = point.x
        defPos[idx + 1] = point.y
        defPos[idx + 2] = point.z
      }
      deflectParticles.geometry.attributes.position.needsUpdate = true
    }

    function updateNEO(t, earthPos) {
      const cycle = (t * 0.07) % 1
      const start = earthPos.clone().add(new THREE.Vector3(-250, 34, -210))
      const control = earthPos.clone().add(new THREE.Vector3(-16, 54, -10))
      const end = earthPos.clone().add(new THREE.Vector3(300, 118, 230))

      const currentPoint = quadraticBezierPoint(start, control, end, cycle)
      const previousPoint = quadraticBezierPoint(start, control, end, Math.max(cycle - 0.012, 0))
      const travelDirection = currentPoint.clone().sub(previousPoint).normalize()

      neoGroup.position.copy(currentPoint)
      neoBody.rotation.x += 0.018
      neoBody.rotation.y += 0.013
      neoGlow.position.set(0, 0, 0)

      if (travelDirection.lengthSq() > 0.0001) {
        const yaw = Math.atan2(travelDirection.x, travelDirection.z)
        const pitch = Math.asin(THREE.MathUtils.clamp(travelDirection.y, -1, 1))
        neoGroup.rotation.set(-pitch * 0.5, yaw, 0)
      }

      const trailPoints = []
      for (let i = 0; i < 30; i += 1) {
        const trailT = Math.max(cycle - i * 0.02, 0)
        const point = quadraticBezierPoint(start, control, end, trailT)
        trailPoints.push(point)
      }
      neoTrail.geometry.dispose()
      neoTrail.geometry = new THREE.BufferGeometry().setFromPoints(trailPoints)
    }

    function updateEventVisibility(t) {
      const activeType = activeViewEnabled ? selectedNotableEvent?.type : null

      cmeParticles.visible = activeType === 'cme'
      deflectParticles.visible = activeType === 'cme'
      flareCurve.visible = activeType === 'flare'
      flareHalo.visible = activeType === 'flare'
      neoGroup.visible = activeType === 'neo'
      neoTrail.visible = activeType === 'neo'

      if (flareCurve.visible) {
        flareCurve.rotation.y = t * 0.32
        flareCurve.rotation.z = Math.sin(t * 0.5) * 0.18
        flareHalo.rotation.y += 0.008
        flareHalo.rotation.z = Math.PI / 5 + Math.sin(t * 0.8) * 0.12
      }

      if (eventLabel) {
        eventLabel.visible = Boolean(activeType)
        if (activeType === 'cme') {
          eventLabel.position.copy(earth.position.clone().lerp(sun.position.clone(), 0.28))
          eventLabel.position.y += 34
        } else if (activeType === 'flare') {
          eventLabel.position.set(88, 82, -6)
        } else if (activeType === 'neo') {
          eventLabel.position.copy(neoGroup.position.clone())
          eventLabel.position.y += 26
        }
      }
    }

    function animate() {
      const t = clock.getElapsedTime()
      animationId = window.requestAnimationFrame(animate)

      sun.rotation.y += 0.0016
      sunGlow.rotation.y -= 0.0008
      stars.rotation.y += 0.00015
      earth.rotation.y += 0.01
      mars.rotation.y += 0.008
      jupiter.rotation.y += 0.02
      saturn.rotation.y += 0.018
      moon.rotation.y += 0.01
      magnetosphere.rotation.y += 0.002

      moon.position.set(
        earth.position.x + Math.cos(t * 1.8) * 18,
        0,
        earth.position.z + Math.sin(t * 1.8) * 18
      )

      updateSolarWind()
      updateCME(sun.position.clone(), earth.position.clone())
      updateNEO(t, earth.position.clone())
      updateEventVisibility(t)

      controls.update()
      renderer.render(scene, camera)
    }

    function handleResize() {
      if (!mount) return
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }

    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      window.cancelAnimationFrame(animationId)
      controls.dispose()
      neoTrail.geometry.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
    }
  }, [activeViewEnabled, selectedNotableEvent])

  return <div ref={mountRef} className="solar-scene-3d" />
}

export default SolarSystemScene
