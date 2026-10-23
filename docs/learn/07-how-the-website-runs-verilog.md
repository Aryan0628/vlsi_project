# 7. How the Website Runs the Verilog

The website does **not** contain a copy of the vending machine logic in JavaScript. Every result you see comes from the Verilog simulator. This file explains how.

## 7.1 The flow of one button click

```
 You click "₹10"
      │
      ▼
 ① Website adds {type:'coin', value:10} to the list of ALL actions so far
      │  POST /api/simulate  { actions: [ select B, coin 10, coin 10 ] }
      ▼
 ② Server turns each action into one line of inputs.txt
      │     1 1 0 0      ← select B   (sel_valid sel coin cancel)
      │     0 0 0 0      ← idle
      │     0 0 0 0      ← idle
      │     0 0 0 0      ← idle
      │     0 0 2 0      ← coin ₹10
      │     ...
      ▼
 ③ Server runs:  vvp sim.out +IN=inputs.txt +VCD=wave.vcd
      │
      ▼
 ④ sim_driver.v resets the machine, applies one line per clock,
      │  and prints one "CYCLE ..." line after every clock edge
      ▼
 ⑤ Server reads those lines and sends them back as JSON
      │
      ▼
 ⑥ Website plays the new clock cycles one by one (about 0.4 s each):
    LCD, product slots, state diagram, waveform and register table all update
```

## 7.2 `sim_driver.v` — a testbench that reads a file

File: [`verilog/sim_driver.v`](../../verilog/sim_driver.v)

It is a second testbench, just like `tb_vending_machine.v`, but instead of fixed tests it **reads the inputs from a text file**.

### Input file format

One line = one clock cycle:

```
sel_valid  sel  coin  cancel
```

| Line | Meaning |
|---|---|
| `1 1 0 0` | press product B (`sel_valid=1`, `sel=1`) |
| `0 0 2 0` | insert coin code `10` (₹10) |
| `0 0 1 0` | insert ₹5 |
| `0 0 3 0` | insert ₹20 |
| `0 0 0 1` | press cancel |
| `0 0 0 0` | nothing (idle cycle) |

### Reading the file

```verilog
if (!$value$plusargs("IN=%s", in_file))  in_file  = "inputs.txt";
...
fd = $fopen(in_file, "r");
...
while (!$feof(fd)) begin
    n = $fscanf(fd, "%d %d %d %d\n", v_sel_valid, v_sel, v_coin, v_cancel);
    if (n == 4) begin
        sel_valid = v_sel_valid; sel = v_sel; coin = v_coin; cancel = v_cancel;
        @(posedge clk); #1;
        $display("CYCLE %0d %0d %0d %0d %0d | %0d %0d ...", cycle, ..., state, amount, ...);
        cycle = cycle + 1;
    end
end
```

- `$value$plusargs("IN=%s", ...)` reads a command-line option like `+IN=inputs.txt`.
- `$fopen`, `$fscanf`, `$feof` — open, read and check end of a file (like C).
- For each line: put the values on the inputs, wait for one clock edge, then print all outputs.

### Output format

```
CYCLE 2 0 0 2 0 | 2 20 15 1 1 0 0 0 0 3 3 3 3
      │ └─inputs┘   │ │  │  │ │ │ │ │ │ └ stock a b c d
      │             │ │  │  │ │ │ │ │ └ total_sales
      │             │ │  │  │ │ │ │ └ sold_out
      │             │ │  │  │ │ │ └ refund
      │             │ │  │  │ │ └ change
      │             │ │  │  │ └ dispense
      │             │ │  │  └ item
      │             │ │  └ price
      │             │ └ amount
      │             └ state (2 = DISPENSE)
      └ cycle number
```

## 7.3 The server

File: [`server/index.js`](../../server/index.js) (Node.js + Express)

1. **At startup** it compiles the design once:
   ```bash
   iverilog -o sim.out vending_machine.v sim_driver.v
   ```
   If Icarus Verilog is not installed, the server stops with a clear message.

2. **`POST /api/simulate`** — receives the list of actions, writes `inputs.txt`, runs `vvp`, parses the `CYCLE` lines into JSON and returns:
   ```json
   {
     "trace": [ { "cycle": 0, "state": 1, "amount": 0, "price": 15, "dispense": 0, ... }, ... ],
     "actionStart": [0, 4, 8]
   }
   ```
   `actionStart` tells the website which cycle each action started at, so it knows which cycles are "new" and should be animated.

3. **`GET /api/vcd`** — downloads the waveform of the last run, to open in GTKWave.

### Why 3 idle cycles after every action?

After the last coin, the FSM still needs a few clock cycles to go DISPENSE → CHANGE → IDLE **by itself** (no input needed). So after each action the server adds 3 lines of `0 0 0 0` to let the machine finish.

### Why send ALL actions every time? ("replay from reset")

The simulator program starts, runs and exits for every click; it does not stay running between clicks. So each time, we **start from reset and replay every action** from the beginning. Because the design is deterministic (same inputs → same outputs every time), the result is exactly the same as if the machine had been running all along.

Advantages:
- The server keeps **no memory** of the machine — simple and reliable.
- Many people can use the website at the same time; each browser sends its own action list.
- It proves the hardware is deterministic.

The cost is a little extra simulation time as the list grows, but the simulation takes only milliseconds, so it doesn't matter.

Next: [08 — The frontend](08-frontend.md)
