import { useState } from 'react'
import { Cpu, RotateCcw, Download, TriangleAlert } from 'lucide-react'
import { simulate } from './api'
import { PRODUCTS, RESET_ROW, S, COIN_VALUE } from './constants'
import Machine from './components/Machine'
import FsmDiagram from './components/FsmDiagram'
import SignalTable from './components/SignalTable'
import Waveform from './components/Waveform'
import EventLog from './components/EventLog'

const STEP_MS = 380 // delay between clock cycles in the animation
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Describe what happened during one action, using the Verilog outputs
function describe(action, cycles) {
  const last = cycles[cycles.length - 1]
  if (action.type === 'select') {
    const p = PRODUCTS[action.item]
    return last.soldOut
      ? { text: `${p.name} is SOLD OUT`, kind: 'warn' }
      : { text: `Selected ${p.code} · ${p.name} (₹${p.price})`, kind: 'info' }
  }
  if (action.type === 'cancel') {
    const r = cycles.find((c) => c.refund > 0)
    return { text: r ? `Cancelled · refunded ₹${r.refund}` : 'Cancelled', kind: 'warn' }
  }
  const d = cycles.find((c) => c.dispense)
  if (d) {
    const ch = cycles.find((c) => c.state === S.CHANGE)?.change ?? 0
    const extra = ch > 0 ? ` · change ₹${ch}` : ''
    return { text: `Inserted ₹${action.value} → dispensed ${PRODUCTS[d.item].name}${extra}`, kind: 'ok' }
  }
  return { text: `Inserted ₹${action.value} (total ₹${last.amount})`, kind: 'info' }
}

export default function App() {
  const [actions, setActions] = useState([])
  const [trace, setTrace] = useState([])
  const [cursor, setCursor] = useState(-1) // which cycle is shown
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [log, setLog] = useState([])
  const [tray, setTray] = useState({ item: null, coins: 0, kind: null, key: 0 })

  const row = cursor >= 0 ? trace[cursor] : RESET_ROW
  const prevRow = cursor > 0 ? trace[cursor - 1] : RESET_ROW

  async function doAction(action) {
    if (busy) return
    setBusy(true)
    setError('')
    const next = [...actions, action]
    try {
      const result = await simulate(next)
      const start = result.actionStart[next.length - 1]
      const cycles = result.trace.slice(start)
      setActions(next)
      setTrace(result.trace)

      if (action.type === 'select' && !cycles[cycles.length - 1].soldOut) {
        setTray((t) => ({ ...t, item: null, coins: 0, kind: null }))
      }

      // play the new clock cycles one by one so the FSM can be seen moving
      for (let i = start; i < result.trace.length; i++) {
        setCursor(i)
        const c = result.trace[i]
        if (c.dispense) setTray((t) => ({ ...t, item: c.item, key: t.key + 1 }))
        if (c.change > 0) setTray((t) => ({ ...t, coins: c.change, kind: 'change' }))
        if (c.refund > 0) setTray((t) => ({ ...t, coins: c.refund, kind: 'refund' }))
        await sleep(STEP_MS)
      }
      setLog((l) => [{ id: next.length, ...describe(action, cycles) }, ...l])
    } catch {
      setError('Cannot reach the simulation server. Start it with: cd server && npm start')
    }
    setBusy(false)
  }

  function reset() {
    setActions([])
    setTrace([])
    setCursor(-1)
    setLog([])
    setTray({ item: null, coins: 0, kind: null, key: 0 })
    setError('')
  }

  const lastCoin = row.inputs.coin ? `₹${COIN_VALUE[row.inputs.coin]}` : null

  return (
    <div className="page">
      <header className="topbar">
        <div className="brand">
          <span className="brand-chip"><Cpu size={20} /></span>
          <div>
            <h1>Vending Machine FSM</h1>
            <p>Verilog HDL · simulated live with Icarus Verilog</p>
          </div>
        </div>
        <div className="top-actions">
          <a className="btn ghost" href="/api/vcd" aria-disabled={!trace.length}>
            <Download size={16} /> Download .vcd
          </a>
          <button className="btn ghost" onClick={reset} disabled={busy}>
            <RotateCcw size={16} /> Reset machine
          </button>
        </div>
      </header>

      {error && (
        <div className="error"><TriangleAlert size={18} /> {error}</div>
      )}

      <main className="layout">
        <Machine row={row} busy={busy} tray={tray} onAction={doAction} lastCoin={lastCoin} />

        <section className="hw">
          <div className="panel">
            <div className="panel-head">
              <h2>State diagram</h2>
              <span className="tag">cycle {Math.max(cursor, 0)}</span>
            </div>
            <FsmDiagram state={row.state} prevState={prevRow.state} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Waveform</h2>
              <span className="tag">from Verilog simulation</span>
            </div>
            <Waveform trace={trace} cursor={cursor} />
          </div>

          <div className="split">
            <div className="panel">
              <div className="panel-head"><h2>Registers &amp; outputs</h2></div>
              <SignalTable row={row} />
            </div>
            <div className="panel">
              <div className="panel-head"><h2>Event log</h2></div>
              <EventLog log={log} />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
