// Sends every action so far to the server, which replays them on the Verilog FSM
export async function simulate(actions) {
  const res = await fetch('/api/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actions }),
  })
  if (!res.ok) throw new Error(`Server error ${res.status}`)
  return res.json() // { trace: [...cycles], actionStart: [...] }
}
