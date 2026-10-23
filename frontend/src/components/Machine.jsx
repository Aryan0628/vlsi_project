import { Coins, Banknote, CircleX, PackageOpen } from 'lucide-react'
import { PRODUCTS, COINS, S } from '../constants'

// Text on the LCD, decided only from the Verilog outputs
function lcdText(row) {
  const p = PRODUCTS[row.item]
  switch (row.state) {
    case S.WAIT_COIN:
      return [`${p.code} ${p.name.toUpperCase()}  ₹${row.price}`, `PAID ₹${row.amount}  NEED ₹${row.price - row.amount}`]
    case S.DISPENSE:
      return ['DISPENSING...', p.name.toUpperCase()]
    case S.CHANGE:
      return ['THANK YOU!', row.change > 0 ? `TAKE CHANGE ₹${row.change}` : 'EXACT AMOUNT']
    case S.REFUND:
      return ['CANCELLED', `REFUND ₹${row.refund}`]
    default:
      return row.soldOut ? ['SOLD OUT', 'CHOOSE ANOTHER'] : ['SELECT PRODUCT', 'A · B · C · D']
  }
}

export default function Machine({ row, busy, tray, onAction, lastCoin }) {
  const [line1, line2] = lcdText(row)
  const idle = row.state === S.IDLE && !busy
  const waiting = row.state === S.WAIT_COIN && !busy

  return (
    <section className="machine" aria-label="Vending machine">
      <div className="cabinet">
        {/* glass window with products */}
        <div className="window">
          {PRODUCTS.map((p, i) => {
            const left = row.stock[i]
            const active = row.state !== S.IDLE && row.item === i
            return (
              <div key={p.code} className={`slot ${left === 0 ? 'empty' : ''} ${active ? 'active' : ''}`}>
                <p.Icon size={34} strokeWidth={1.6} />
                <span className="slot-name">{p.name}</span>
                <div className="slot-meta">
                  <span className="slot-code">{p.code}</span>
                  <span>₹{p.price}</span>
                </div>
                <div className="stock" aria-label={`${left} left`}>
                  {[0, 1, 2].map((k) => <i key={k} className={k < left ? 'on' : ''} />)}
                </div>
                {left === 0 && <span className="sold">SOLD OUT</span>}
              </div>
            )
          })}
        </div>

        {/* control panel */}
        <div className="controls">
          <div className="lcd" aria-live="polite">
            <span>{line1}</span>
            <span>{line2}</span>
          </div>

          <div className="ctrl-label">1 · Select</div>
          <div className="keypad">
            {PRODUCTS.map((p, i) => (
              <button key={p.code} className="key" disabled={!idle}
                onClick={() => onAction({ type: 'select', item: i })}>
                {p.code}
              </button>
            ))}
          </div>

          <div className="ctrl-label">2 · Insert money</div>
          <div className="coins">
            {COINS.map((c) => (
              <button key={c.value} className="coin" disabled={!waiting}
                onClick={() => onAction({ type: 'coin', value: c.value })}>
                {c.value === 20 ? <Banknote size={16} /> : <Coins size={16} />}
                ₹{c.value}
              </button>
            ))}
          </div>

          <button className="cancel" disabled={!waiting} onClick={() => onAction({ type: 'cancel' })}>
            <CircleX size={16} /> Cancel &amp; refund
          </button>

          <div className="total">
            <span>Total sales</span>
            <strong>₹{row.totalSales}</strong>
          </div>
        </div>

        {/* output trays */}
        <div className="trays">
          <div className="tray">
            <span className="tray-label"><PackageOpen size={14} /> Pickup</span>
            {tray.item !== null && (() => {
              const P = PRODUCTS[tray.item]
              return <span key={tray.key} className="dropped"><P.Icon size={30} /> {P.name}</span>
            })()}
          </div>
          <div className="cup">
            <span className="tray-label">{tray.kind === 'refund' ? 'Refund' : 'Change'}</span>
            {tray.coins > 0 && <strong className="cup-amount">₹{tray.coins}</strong>}
          </div>
        </div>
      </div>
      {lastCoin && busy && <div className="coin-fly" key={row.cycle}>{lastCoin}</div>}
    </section>
  )
}
