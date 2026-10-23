# 8. The Frontend (React website)

The website is only for **showing and operating** the machine. All decisions are made by the Verilog (see file 7).

**Tech:** React (UI library) + Vite (dev server/build tool) + lucide-react (icons). Styling is plain CSS in `src/index.css`.

## Files

| File | What it does |
|---|---|
| `src/App.jsx` | Main page. Keeps the list of actions, calls the server, plays the clock cycles one by one, writes the event log |
| `src/api.js` | One function `simulate(actions)` that calls `POST /api/simulate` |
| `src/constants.js` | Product names/prices, coin codes, state names — **same values as the Verilog** |
| `src/components/Machine.jsx` | The vending machine: product window with stock dots, LCD screen, A–D buttons, coin buttons, cancel, pickup tray, change cup |
| `src/components/FsmDiagram.jsx` | SVG state diagram; the current state glows and the arrow just taken turns orange |
| `src/components/Waveform.jsx` | Draws a timing diagram (clk, sel_valid, coin, cancel, state, amount, dispense, change, refund) from the simulation trace |
| `src/components/SignalTable.jsx` | Current values of the Verilog outputs in Verilog format (`3'b001`, `8'd15`…) |
| `src/components/EventLog.jsx` | List of what happened ("Inserted ₹10 → dispensed Coffee · change ₹5") |

## How it behaves

- Buttons are enabled based on the **Verilog state**: product buttons only in IDLE, coins and cancel only in WAIT_COIN.
- The LCD text is chosen from the Verilog outputs (state, amount, price, change, refund, sold_out).
- After each click, the new clock cycles are played at ~0.4 s per cycle, so you can watch the FSM move through DISPENSE and CHANGE.
- **Reset machine** clears the action list (like pressing the hardware reset).
- **Download .vcd** downloads the real waveform file of the current session.
- In development, Vite forwards `/api/...` requests to the server on port 3001 (`vite.config.js`). In production, the server serves the built website itself.

Next: [09 — Run and deploy](09-run-and-deploy.md)
