import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import * as THREE from 'three'

function buildHeartGeometry() {
  const x = 0, y = 0
  const shape = new THREE.Shape()
  shape.moveTo(x + 5, y + 5)
  shape.bezierCurveTo(x + 5, y + 5, x + 4, y, x, y)
  shape.bezierCurveTo(x - 6, y, x - 6, y + 7, x - 6, y + 7)
  shape.bezierCurveTo(x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19)
  shape.bezierCurveTo(x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7)
  shape.bezierCurveTo(x + 16, y + 7, x + 16, y, x + 10, y)
  shape.bezierCurveTo(x + 7, y, x + 5, y + 5, x + 5, y + 5)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 3.5,
    bevelEnabled: true,
    bevelThickness: 0.8,
    bevelSize: 0.6,
    bevelSegments: 14,
  })
  geo.center()
  geo.scale(0.165, 0.165, 0.165)
  return geo
}

export default function Heart3D({ size = 380 }) {
  const mountRef = useRef(null)
  const mouseRef = useRef({ x: 0, y: 0 })
  const isInsideRef = useRef(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let cleanup = () => {}
    let isCurrent = true  // guards against React StrictMode double-invoke

    if (navigator.gpu) {
      initWebGPU().catch((err) => {
        if (!isCurrent) return
        console.warn('[Heart3D] WebGPU failed, falling back to WebGL:', err)
        cleanup = initWebGL()
      })
    } else {
      cleanup = initWebGL()
    }

    // ── WebGPU path ────────────────────────────────────────────────────────────
    async function initWebGPU() {
      const gpuMod = await import('three/webgpu')
      if (!isCurrent) return  // StrictMode unmounted before async resolved

      const WebGPURenderer = gpuMod.default ?? gpuMod.WebGPURenderer
      const { MeshStandardNodeMaterial } = gpuMod

      const {
        sin, time,
        positionLocal, normalWorld,
        mix, clamp, dot,
        vec3, color: c, float,
      } = await import('three/tsl')
      if (!isCurrent) return

      // Scene
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100)
      camera.position.z = 6

      const renderer = new WebGPURenderer({ antialias: true, alpha: true })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      await renderer.init()
      mount.appendChild(renderer.domElement)

      const geometry = buildHeartGeometry()

      // ── TSL heart material ─────────────────────────────────────────────────
      const heartMat = new MeshStandardNodeMaterial()

      // Vertex displacement: GPU-side breathing pulse + surface ripple
      const pulse = sin(time.mul(2.2)).mul(0.022)
      const ripple = sin(time.mul(0.9).add(positionLocal.y.mul(2.5))).mul(0.014)
      heartMat.positionNode = positionLocal.add(normalWorld.mul(pulse.add(ripple)))

      // Normal-based color: shadow side → lit front
      const facing = clamp(dot(normalWorld, vec3(0.25, 0.45, 1.0)), 0.0, 1.0)
      heartMat.colorNode = mix(
        c(0x7A1828),   // deep shadow coral
        c(0xFF7088),   // bright lit pink
        facing.pow(float(0.55))
      )

      // Emissive bevel glow — picks up the bevel's back-facing normals
      const bevelGlow = clamp(dot(normalWorld, vec3(0.0, -0.8, -0.6)), 0.0, 1.0).pow(float(2.5))
      heartMat.emissiveNode = c(0xCF4462).mul(bevelGlow.mul(0.28))

      heartMat.roughness = 0.12
      heartMat.metalness = 0.08

      const edgeMat = new MeshStandardNodeMaterial()
      edgeMat.colorNode = c(0xFF8898)
      edgeMat.roughness = 0.26
      edgeMat.metalness = 0.05

      const heart = new THREE.Mesh(geometry, [heartMat, edgeMat])
      heart.rotation.z = Math.PI
      scene.add(heart)

      // Lights
      scene.add(new THREE.AmbientLight(0xfff0f0, 0.55))
      const key = new THREE.DirectionalLight(0xffffff, 2.2)
      key.position.set(4, 5, 6); scene.add(key)
      const fill = new THREE.DirectionalLight(0xffb0c0, 0.9)
      fill.position.set(-5, 1, 3); scene.add(fill)
      const rim = new THREE.DirectionalLight(0xff8899, 1.1)
      rim.position.set(0, -4, -4); scene.add(rim)
      const bounce = new THREE.DirectionalLight(0xffd8e0, 0.5)
      bounce.position.set(0, -6, 2); scene.add(bounce)

      // Spring pop + mouse
      let scale = 0, scaleVel = 0, smoothX = 0, smoothY = 0, autoT = 0

      function onMouseMove(e) {
        const r = mount.getBoundingClientRect()
        mouseRef.current = {
          x: ((e.clientX - r.left) / r.width - 0.5) * 2,
          y: -((e.clientY - r.top) / r.height - 0.5) * 2,
        }
      }
      function onMouseEnter() { isInsideRef.current = true }
      function onMouseLeave() { isInsideRef.current = false }
      window.addEventListener('mousemove', onMouseMove)
      mount.addEventListener('mouseenter', onMouseEnter)
      mount.addEventListener('mouseleave', onMouseLeave)

      let animId
      function animate() {
        animId = requestAnimationFrame(animate)
        autoT += 0.008
        scaleVel = scaleVel * 0.70 + (1 - scale) * 0.044
        scale += scaleVel
        heart.scale.setScalar(scale)

        const tX = isInsideRef.current ? mouseRef.current.x * 0.55 : 0
        const tY = isInsideRef.current ? mouseRef.current.y * 0.35 : 0
        smoothX += (tX - smoothX) * 0.06
        smoothY += (tY - smoothY) * 0.06

        heart.rotation.y = Math.sin(autoT * 0.9) * 0.22 + smoothX
        heart.rotation.x = Math.sin(autoT * 0.55) * 0.08 + smoothY
        heart.position.y = Math.sin(autoT * 1.1) * 0.06

        renderer.renderAsync(scene, camera)
      }
      animate()

      cleanup = () => {
        cancelAnimationFrame(animId)
        window.removeEventListener('mousemove', onMouseMove)
        mount.removeEventListener('mouseenter', onMouseEnter)
        mount.removeEventListener('mouseleave', onMouseLeave)
        geometry.dispose()
        heartMat.dispose()
        edgeMat.dispose()
        renderer.dispose()
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      }
    }

    // ── WebGL fallback ─────────────────────────────────────────────────────────
    function initWebGL() {
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 100)
      camera.position.z = 6

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(size, size)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x000000, 0)
      renderer.shadowMap.enabled = true
      mount.appendChild(renderer.domElement)

      const geometry = buildHeartGeometry()
      const material = new THREE.MeshStandardMaterial({ color: 0xCF4462, roughness: 0.18, metalness: 0.08 })
      const edgeMaterial = new THREE.MeshStandardMaterial({ color: 0xE8607A, roughness: 0.3, metalness: 0.05 })
      const heart = new THREE.Mesh(geometry, [material, edgeMaterial])
      heart.rotation.z = Math.PI
      scene.add(heart)

      scene.add(new THREE.AmbientLight(0xfff0f0, 0.55))
      const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(4, 5, 6); scene.add(key)
      const fill = new THREE.DirectionalLight(0xffb0c0, 0.9); fill.position.set(-5, 1, 3); scene.add(fill)
      const rim = new THREE.DirectionalLight(0xff8899, 1.1); rim.position.set(0, -4, -4); scene.add(rim)
      const bounce = new THREE.DirectionalLight(0xffd8e0, 0.5); bounce.position.set(0, -6, 2); scene.add(bounce)

      let scale = 0, scaleVel = 0, smoothX = 0, smoothY = 0, autoT = 0

      function onMouseMove(e) {
        const r = mount.getBoundingClientRect()
        mouseRef.current = {
          x: ((e.clientX - r.left) / r.width - 0.5) * 2,
          y: -((e.clientY - r.top) / r.height - 0.5) * 2,
        }
      }
      function onMouseEnter() { isInsideRef.current = true }
      function onMouseLeave() { isInsideRef.current = false }
      window.addEventListener('mousemove', onMouseMove)
      mount.addEventListener('mouseenter', onMouseEnter)
      mount.addEventListener('mouseleave', onMouseLeave)

      let animId
      function animate() {
        animId = requestAnimationFrame(animate)
        autoT += 0.008
        scaleVel = scaleVel * 0.70 + (1 - scale) * 0.044
        scale += scaleVel
        heart.scale.setScalar(scale)
        const tX = isInsideRef.current ? mouseRef.current.x * 0.55 : 0
        const tY = isInsideRef.current ? mouseRef.current.y * 0.35 : 0
        smoothX += (tX - smoothX) * 0.06
        smoothY += (tY - smoothY) * 0.06
        heart.rotation.y = Math.sin(autoT * 0.9) * 0.22 + smoothX
        heart.rotation.x = Math.sin(autoT * 0.55) * 0.08 + smoothY
        heart.position.y = Math.sin(autoT * 1.1) * 0.06
        renderer.render(scene, camera)
      }
      animate()

      return () => {
        cancelAnimationFrame(animId)
        window.removeEventListener('mousemove', onMouseMove)
        mount.removeEventListener('mouseenter', onMouseEnter)
        mount.removeEventListener('mouseleave', onMouseLeave)
        geometry.dispose()
        material.dispose()
        edgeMaterial.dispose()
        renderer.dispose()
        if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      }
    }

    return () => {
      isCurrent = false
      cleanup()
    }
  }, [size])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      ref={mountRef}
      style={{
        width: size,
        height: size,
        cursor: 'grab',
        userSelect: 'none',
        filter: 'drop-shadow(0 32px 64px rgba(207,68,98,0.32)) drop-shadow(0 8px 24px rgba(207,68,98,0.22))',
      }}
    />
  )
}
