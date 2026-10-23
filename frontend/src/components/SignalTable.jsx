import { STATES } from '../constants'

const bin = (v, bits) => `${bits}'b${v.toString(2).padStart(bits, '0')}`

// Shows the Verilog output ports for the current clock cycle
export default function SignalTable({ row }) {
  const rows = [
    ['state', bin(row.state, 3), STATES[row.state]],
    ['amount', `8'd${row.amount}`, `₹${row.amount}`],
    ['price', `8'd${row.price}`, `₹${row.price}`],
    ['item', bin(row.item, 2), 'ABCD'[row.item]],
    ['dispense', `1'b${row.dispense}`, row.dispense ? 'ON' : '–'],
    ['change', `8'd${row.change}`, `₹${row.change}`],
    ['refund', `8'd${row.refund}`, `₹${row.refund}`],
    ['sold_out', `1'b${row.soldOut}`, row.soldOut ? 'YES' : '–'],
    ['total_sales', `16'd${row.totalSales}`, `₹${row.totalSales}`],
    ['stock a/b/c/d', row.stock.join(' / '), 'units'],
  ]
  return (
    <table className="signals">
      <tbody>
        {rows.map(([name, value, meaning]) => (
          <tr key={name}>
            <td className="sig">{name}</td>
            <td className="val">{value}</td>
            <td className="mean">{meaning}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
