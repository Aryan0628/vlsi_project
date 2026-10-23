import { STATES } from '../constants'

// Node positions in the SVG
const NODES = {
  0: { x: 90, y: 150 },   // IDLE
  1: { x: 300, y: 60 },   // WAIT_COIN
  2: { x: 520, y: 60 },   // DISPENSE
  3: { x: 520, y: 240 },  // CHANGE
  4: { x: 300, y: 240 },  // REFUND
}
const R = 42

// Transitions from vending_machine.v: [from, to, label, label position]
const EDGES = [
  [0, 1, 'sel_valid & stock>0', [222, 128]],
  [1, 2, 'amount ≥ price', [410, 46]],
  [2, 3, 'next clk', [560, 150]],
  [3, 0, 'change out', [300, 300]],
  [1, 4, 'cancel', [325, 150]],
  [4, 0, 'refund out', [170, 222]],
]

// point on the circle edge, pointing towards (tx, ty)
function edgePoint(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy)
  return { x: a.x + (dx / len) * R, y: a.y + (dy / len) * R }
}

function edgePath(from, to) {
  const a = NODES[from]
  const b = NODES[to]
  // CHANGE -> IDLE goes around the bottom so it does not cross REFUND
  if (from === 3 && to === 0) {
    const s = { x: a.x - 20, y: a.y + R - 4 }
    const e = { x: b.x + 10, y: b.y + R }
    return `M${s.x},${s.y} C${s.x - 120},${330} ${e.x + 40},${320} ${e.x},${e.y + 2}`
  }
  const s = edgePoint(a, b)
  const e = edgePoint(b, a)
  return `M${s.x},${s.y} L${e.x},${e.y}`
}

export default function FsmDiagram({ state, prevState }) {
  return (
    <svg className="fsm" viewBox="0 0 620 330" role="img" aria-label={`Current state ${STATES[state]}`}>
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--edge)" />
        </marker>
        <marker id="arrow-hot" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="var(--accent)" />
        </marker>
      </defs>

      {/* reset arrow into IDLE */}
      <path d="M10,150 L46,150" className="edge" markerEnd="url(#arrow)" />
      <text x="8" y="140" className="edge-label">rst</text>

      {/* self loops */}
      <path d="M70,113 C50,70 130,70 110,113" className="edge" markerEnd="url(#arrow)" />
      <text x="62" y="66" className="edge-label">sold out</text>
      <path d="M282,23 C262,-8 338,-8 318,23" className={`edge ${prevState === 1 && state === 1 ? 'hot' : ''}`} markerEnd="url(#arrow)" />
      <text x="342" y="16" className="edge-label">coin, amount &lt; price</text>

      {EDGES.map(([from, to, label, [lx, ly]]) => {
        const hot = prevState === from && state === to
        return (
          <g key={`${from}-${to}`}>
            <path d={edgePath(from, to)} className={`edge ${hot ? 'hot' : ''}`}
              markerEnd={hot ? 'url(#arrow-hot)' : 'url(#arrow)'} />
            <text x={lx} y={ly} className={`edge-label ${hot ? 'hot' : ''}`} textAnchor="middle">{label}</text>
          </g>
        )
      })}

      {Object.entries(NODES).map(([id, { x, y }]) => {
        const active = Number(id) === state
        return (
          <g key={id} className={`node ${active ? 'active' : ''}`}>
            <circle cx={x} cy={y} r={R} />
            <text x={x} y={y - 2} textAnchor="middle" className="node-name">{STATES[id]}</text>
            <text x={x} y={y + 14} textAnchor="middle" className="node-code">
              {Number(id).toString(2).padStart(3, '0')}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
