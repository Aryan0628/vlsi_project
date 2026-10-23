import { COIN_VALUE } from '../constants'

const SHORT_STATE = ['IDLE', 'WAIT', 'DISP', 'CHG', 'RFND']
const WINDOW = 24     // cycles visible at once
const CW = 32         // width of one cycle
const LABEL_W = 92
const ROW_H = 26
const HI = 5          // y of logic 1 inside a row
const LO = 19         // y of logic 0 inside a row

// kind: 'clk' | 'bit' | 'bus'
const SIGNALS = [
  { name: 'clk', kind: 'clk' },
  { name: 'sel_valid', kind: 'bit', get: (c) => c.inputs.selValid },
  { name: 'coin', kind: 'bus', get: (c) => c.inputs.coin, fmt: (v) => (v ? `₹${COIN_VALUE[v]}` : '0') },
  { name: 'cancel', kind: 'bit', get: (c) => c.inputs.cancel },
  { name: 'state', kind: 'bus', get: (c) => c.state, fmt: (v) => SHORT_STATE[v] },
  { name: 'amount', kind: 'bus', get: (c) => c.amount },
  { name: 'dispense', kind: 'bit', get: (c) => c.dispense },
  { name: 'change', kind: 'bus', get: (c) => c.change },
  { name: 'refund', kind: 'bus', get: (c) => c.refund },
]

// group consecutive equal values into segments [{start, len, value}]
function segments(values) {
  const out = []
  values.forEach((v, i) => {
    const last = out[out.length - 1]
    if (last && last.value === v) last.len++
    else out.push({ start: i, len: 1, value: v })
  })
  return out
}

function BitWave({ values }) {
  let d = ''
  values.forEach((v, i) => {
    const y = v ? HI : LO
    d += i === 0 ? `M0,${y}` : ` L${i * CW},${y}`
    d += ` L${(i + 1) * CW},${y}`
  })
  return <path d={d} className="wave-line" />
}

function ClkWave({ count }) {
  let d = `M0,${LO}`
  for (let i = 0; i < count; i++) {
    const x = i * CW
    d += ` L${x},${HI} L${x + CW / 2},${HI} L${x + CW / 2},${LO} L${x + CW},${LO}`
  }
  return <path d={d} className="wave-line clk" />
}

function BusWave({ values, fmt }) {
  return segments(values).map((s) => {
    const x0 = s.start * CW
    const x1 = (s.start + s.len) * CW
    const m = 4
    const zero = s.value === 0
    return (
      <g key={s.start}>
        <path d={`M${x0},12 L${x0 + m},${HI} L${x1 - m},${HI} L${x1},12 L${x1 - m},${LO} L${x0 + m},${LO} Z`}
          className={`bus ${zero ? 'zero' : ''}`} />
        {s.len * CW > 22 && (
          <text x={(x0 + x1) / 2} y={16} textAnchor="middle" className="bus-text">
            {fmt ? fmt(s.value) : s.value}
          </text>
        )}
      </g>
    )
  })
}

export default function Waveform({ trace, cursor }) {
  if (cursor < 0) {
    return <p className="empty-note">Press a product button. Each clock cycle of the simulation will appear here.</p>
  }
  const end = cursor + 1
  const start = Math.max(0, end - WINDOW)
  const cycles = trace.slice(start, end)
  const width = LABEL_W + WINDOW * CW
  const height = SIGNALS.length * ROW_H + 18

  return (
    <div className="wave-wrap">
      <svg className="wave" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMinYMin meet">
        {/* cycle numbers */}
        {cycles.map((c, i) => (
          <text key={c.cycle} x={LABEL_W + i * CW + CW / 2} y={11} textAnchor="middle" className="cycle-num">
            {c.cycle}
          </text>
        ))}
        {SIGNALS.map((sig, r) => {
          const values = sig.get ? cycles.map(sig.get) : []
          return (
            <g key={sig.name} transform={`translate(0, ${18 + r * ROW_H})`}>
              <text x={LABEL_W - 10} y={16} textAnchor="end" className="sig-name">{sig.name}</text>
              <g transform={`translate(${LABEL_W}, 0)`}>
                {sig.kind === 'clk' && <ClkWave count={cycles.length} />}
                {sig.kind === 'bit' && <BitWave values={values} />}
                {sig.kind === 'bus' && <BusWave values={values} fmt={sig.fmt} />}
              </g>
            </g>
          )
        })}
        {/* cursor on the latest cycle */}
        <rect x={LABEL_W + (cycles.length - 1) * CW} y={14} width={CW} height={height - 14} className="wave-cursor" />
      </svg>
    </div>
  )
}
