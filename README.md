# Vending Machine using Verilog (FSM) + React Frontend

5th Semester Electronics mini project.
A vending machine is designed as a **Finite State Machine in Verilog HDL**. A React web page lets you operate the machine,
and every button press is **simulated on the real Verilog code** using Icarus Verilog.

## Specification

| Product | Code | Price |
|---|---|---|
| Cola | A (`sel = 00`) | ₹10 |
| Coffee | B (`sel = 01`) | ₹15 |
| Cookies | C (`sel = 10`) | ₹20 |
| Sandwich | D (`sel = 11`) | ₹25 |

| Coin input `coin[1:0]` | Value |
|---|---|
| `00` | no coin |
| `01` | ₹5 |
| `10` | ₹10 |
| `11` | ₹20 note |

Features:
- Select product → insert money → product dispensed when `amount ≥ price`
- Returns **change** (`amount − price`)
- **Cancel** returns all inserted money (refund)
- **Stock count**: 3 units of each product; when it reaches 0 the machine shows SOLD OUT
- **Total sales** register keeps the money earned

## FSM (Moore machine)

```
            sel_valid & stock>0              amount >= price
   ┌──────┐ ─────────────────────▶ ┌───────────┐ ─────────────▶ ┌──────────┐
   │ IDLE │                         │ WAIT_COIN │                │ DISPENSE │
   │ 000  │ ◀──┐                    │    001    │                │   010    │
   └──────┘    │                    └───────────┘                └──────────┘
    ▲   ▲      │ refund out               │ cancel                     │ next clk
    │   │   ┌────────┐                    ▼                            ▼
    │   └── │ REFUND │ ◀──────────────────┘                     ┌──────────┐
    │       │  100   │                                          │  CHANGE  │
    │       └────────┘                                          │   011    │
    └────────────────────── change out ──────────────────────── └──────────┘
```

| State | Code | What happens | Outputs |
|---|---|---|---|
| IDLE | 000 | Wait for product button. Sold-out product → stay here, `sold_out = 1` | – |
| WAIT_COIN | 001 | Add each coin to `amount`. Go to DISPENSE when `amount ≥ price`, REFUND on cancel | – |
| DISPENSE | 010 | Stock − 1, total_sales + price | `dispense = 1` |
| CHANGE | 011 | Return extra money, clear amount | `change = amount − price` |
| REFUND | 100 | Return all money, clear amount | `refund = amount` |

## Project structure

```
verilog/
  vending_machine.v      main FSM design
  tb_vending_machine.v   self-checking testbench (7 tests, dumps vending.vcd)
  sim_driver.v           testbench used by the website (reads inputs from a file)
server/
  index.js               Node/Express: compiles + runs the Verilog with Icarus
frontend/
  src/App.jsx            main page
  src/components/        Machine, FsmDiagram, Waveform, SignalTable, EventLog
```

### How the website talks to Verilog
1. Server starts → `iverilog` compiles `vending_machine.v + sim_driver.v`.
2. You press a button → the page sends the list of all actions to `POST /api/simulate`.
3. Server writes them into `inputs.txt` (one line = one clock: `sel_valid sel coin cancel`), runs `vvp`.
4. `sim_driver.v` prints the outputs every clock; the server converts them to JSON.
5. The page animates the clock cycles: LCD, state diagram, waveform and register table all come from the Verilog outputs.

## How to run (macOS)

```bash
brew install icarus-verilog        # once

# 1) Run the testbench
cd verilog
iverilog -o tb tb_vending_machine.v vending_machine.v
vvp tb                             # prints PASS/FAIL, creates vending.vcd

# 2) Start the backend (terminal 1)
cd server && npm install && npm start      # http://localhost:3001

# 3) Start the frontend (terminal 2)
cd frontend && npm install && npm run dev  # open http://localhost:5173
```

Waveforms: open `vending.vcd` (or "Download .vcd" from the website) in **GTKWave**, **Surfer** or the VS Code **WaveTrace** extension.

The Verilog is plain Verilog-2001, so the same `.v` files also run in **Xilinx Vivado** (college lab, Windows/Linux) and **EDA Playground**.

## Deploy (Render, free)

The `Dockerfile` builds the React app, installs Icarus Verilog and runs the Node server, which serves both the website and the API.

1. Push this folder to a GitHub repository.
2. On https://render.com → **New → Web Service** → connect the repo.
3. Render detects the `Dockerfile` (Language: **Docker**). Choose the **Free** instance type → **Deploy**.
4. After the build finishes, open the `https://<name>.onrender.com` link.

Note: free services sleep after ~15 minutes of no use; the first visit then takes about a minute to wake up.
