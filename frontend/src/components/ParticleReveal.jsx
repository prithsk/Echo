import { useEffect, useRef } from 'react'

// Particle burst — WebGPU if available, Canvas 2D fallback
export default function ParticleReveal({ outcome, active }) {
  const canvasRef = useRef(null)

  const COLORS = {
    mutual:      ['#B87318', '#D4960A', '#F0C040', '#E8A830', '#C88A20', '#FFF0C8'],
    one_sided:   ['#CF4462', '#E05870', '#F07888', '#B83050', '#D85068', '#FFE0E8'],
    no_interest: ['#6B6560', '#8A8480', '#A8A29A', '#4A4640', '#7A7570', '#E8E4E0'],
  }

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const colors = COLORS[outcome] || COLORS.mutual
    const cx = canvas.width / 2
    const cy = canvas.height / 2

    let cleanup
    if (navigator.gpu) {
      cleanup = runWebGPU(canvas, colors, cx, cy)
    } else {
      cleanup = run2D(canvas, colors, cx, cy)
    }
    return () => cleanup && cleanup()
  }, [active, outcome])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        borderRadius: 'inherit',
      }}
    />
  )
}

// ── Canvas 2D fallback ────────────────────────────────────────────────────────

function run2D(canvas, colors, cx, cy) {
  const ctx = canvas.getContext('2d')
  const particles = []
  const NUM = 220

  for (let i = 0; i < NUM; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = Math.random() * 7 + 2
    particles.push({
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - Math.random() * 3,
      r: Math.random() * 5 + 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: Math.random() * 0.018 + 0.008,
      gravity: 0.12,
      shape: Math.random() > 0.5 ? 'circle' : 'star',
    })
  }

  let animId
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    particles.forEach((p) => {
      if (p.life <= 0) return
      alive = true
      ctx.globalAlpha = p.life
      ctx.fillStyle = p.color

      if (p.shape === 'star') {
        drawStar(ctx, p.x, p.y, p.r * p.life)
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2)
        ctx.fill()
      }

      p.x += p.vx
      p.y += p.vy
      p.vy += p.gravity
      p.vx *= 0.99
      p.life -= p.decay
    })
    ctx.globalAlpha = 1
    if (alive) animId = requestAnimationFrame(draw)
  }
  draw()
  return () => cancelAnimationFrame(animId)
}

function drawStar(ctx, x, y, size) {
  ctx.save()
  ctx.translate(x, y)
  ctx.beginPath()
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2
    const ox = Math.cos(angle) * size
    const oy = Math.sin(angle) * size
    const ix = Math.cos(angle + Math.PI / 4) * size * 0.4
    const iy = Math.sin(angle + Math.PI / 4) * size * 0.4
    if (i === 0) ctx.moveTo(ox, oy)
    else ctx.lineTo(ix, iy)
    ctx.lineTo(ox, oy)
  }
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

// ── WebGPU path ───────────────────────────────────────────────────────────────

async function runWebGPU(canvas, colors, cx, cy) {
  try {
    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) return run2D(canvas, colors, cx, cy)
    const device = await adapter.requestDevice()
    const context = canvas.getContext('webgpu')
    const format = navigator.gpu.getPreferredCanvasFormat()
    context.configure({ device, format, alphaMode: 'premultiplied' })

    const NUM = 512
    const STRIDE = 8
    const data = new Float32Array(NUM * STRIDE)
    for (let i = 0; i < NUM; i++) {
      const off = i * STRIDE
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 8 + 2
      data[off + 0] = cx
      data[off + 1] = cy
      data[off + 2] = Math.cos(angle) * speed
      data[off + 3] = Math.sin(angle) * speed - Math.random() * 3
      data[off + 4] = 1.0
      data[off + 5] = Math.random() * 0.015 + 0.007
      data[off + 6] = Math.random() * 6 + 2
      data[off + 7] = Math.floor(Math.random() * colors.length)
    }

    const colorFloats = colors.flatMap((hex) => {
      const n = parseInt(hex.slice(1), 16)
      return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1.0]
    })
    while (colorFloats.length < 8 * 4) colorFloats.push(0, 0, 0, 0)

    const colorBuf = device.createBuffer({ size: 8 * 4 * 4, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    device.queue.writeBuffer(colorBuf, 0, new Float32Array(colorFloats.slice(0, 32)))

    const particleBuf = device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      mappedAtCreation: true,
    })
    new Float32Array(particleBuf.getMappedRange()).set(data)
    particleBuf.unmap()

    const screenBuf = device.createBuffer({ size: 8, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST })
    device.queue.writeBuffer(screenBuf, 0, new Float32Array([canvas.width, canvas.height]))

    const computeShader = device.createShaderModule({ code: COMPUTE_WGSL })
    const renderShader = device.createShaderModule({ code: RENDER_WGSL })

    const computePipeline = device.createComputePipeline({ layout: 'auto', compute: { module: computeShader, entryPoint: 'main' } })
    const renderPipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module: renderShader, entryPoint: 'vs', buffers: [] },
      fragment: { module: renderShader, entryPoint: 'fs', targets: [{ format, blend: { color: { srcFactor: 'src-alpha', dstFactor: 'one-minus-src-alpha', operation: 'add' }, alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' } } }] },
      primitive: { topology: 'triangle-list' },
    })

    const computeBG = device.createBindGroup({ layout: computePipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: particleBuf } }, { binding: 1, resource: { buffer: screenBuf } }] })
    const renderBG = device.createBindGroup({ layout: renderPipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: particleBuf } }, { binding: 1, resource: { buffer: colorBuf } }, { binding: 2, resource: { buffer: screenBuf } }] })

    let running = true
    function frame() {
      if (!running) return
      const enc = device.createCommandEncoder()
      const comp = enc.beginComputePass()
      comp.setPipeline(computePipeline)
      comp.setBindGroup(0, computeBG)
      comp.dispatchWorkgroups(Math.ceil(NUM / 64))
      comp.end()
      const view = context.getCurrentTexture().createView()
      const pass = enc.beginRenderPass({ colorAttachments: [{ view, loadOp: 'clear', clearValue: { r: 0, g: 0, b: 0, a: 0 }, storeOp: 'store' }] })
      pass.setPipeline(renderPipeline)
      pass.setBindGroup(0, renderBG)
      pass.draw(6 * NUM)
      pass.end()
      device.queue.submit([enc.finish()])
      requestAnimationFrame(frame)
    }
    frame()
    return () => { running = false }
  } catch {
    return run2D(canvas, colors, cx, cy)
  }
}

const COMPUTE_WGSL = /* wgsl */`
struct Particle { x: f32, y: f32, vx: f32, vy: f32, life: f32, decay: f32, r: f32, ci: f32 }
@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> screen: vec2<f32>;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  if (i >= arrayLength(&particles)) { return; }
  var p = particles[i];
  if (p.life <= 0.0) { return; }
  p.x += p.vx; p.y += p.vy; p.vy += 0.15; p.vx *= 0.99; p.life -= p.decay;
  particles[i] = p;
}
`

const RENDER_WGSL = /* wgsl */`
struct Particle { x: f32, y: f32, vx: f32, vy: f32, life: f32, decay: f32, r: f32, ci: f32 }
struct Colors { data: array<vec4<f32>, 8> }
@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> colors: Colors;
@group(0) @binding(2) var<uniform> screen: vec2<f32>;
struct VOut { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32>, @location(1) color: vec4<f32> }
@vertex fn vs(@builtin(vertex_index) vi: u32) -> VOut {
  let pi = vi / 6u; let qi = vi % 6u; let p = particles[pi];
  let quad = array<vec2<f32>,6>(vec2(-1.0,-1.0),vec2(1.0,-1.0),vec2(-1.0,1.0),vec2(1.0,-1.0),vec2(1.0,1.0),vec2(-1.0,1.0));
  let q = quad[qi]; let r = p.r * clamp(p.life, 0.0, 1.0);
  let px = (p.x + q.x * r) / screen.x * 2.0 - 1.0;
  let py = 1.0 - (p.y + q.y * r) / screen.y * 2.0;
  let ci = u32(clamp(p.ci, 0.0, 7.0)); var c = colors.data[ci]; c.a *= clamp(p.life, 0.0, 1.0);
  var out: VOut; out.pos = vec4(px, py, 0.0, 1.0); out.uv = q; out.color = c; return out;
}
@fragment fn fs(in: VOut) -> @location(0) vec4<f32> {
  let d = length(in.uv); if (d > 1.0) { discard; }
  let a = 1.0 - smoothstep(0.7, 1.0, d); return vec4(in.color.rgb, in.color.a * a);
}
`
