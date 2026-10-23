# 6. Testbench and Simulation

## 6.1 What is a testbench?

Our design `vending_machine` is a box with input pins and output pins. To check it works, we need someone to **press the buttons, insert coins, and check the outputs**. In Verilog that "someone" is another module called a **testbench**.

```
 ┌───────────────────────────── tb_vending_machine ─────────────────────────────┐
 │                                                                               │
 │   clock generator ──clk──▶ ┌───────────────────┐                              │
 │                            │                   │──dispense, change, ...──┐    │
 │   stimulus (initial) ────▶ │  vending_machine  │                         │    │
 │   sel, coin, cancel, rst   │   (instance: dut) │                         ▼    │
 │                            └───────────────────┘                  checker      │
 │                                                                  PASS / FAIL  │
 └───────────────────────────────────────────────────────────────────────────────┘
```

A testbench:
- has **no inputs or outputs** of its own (it is the top of the simulation),
- **creates the clock**,
- **drives the inputs** step by step,
- **checks the outputs** and prints PASS or FAIL,
- **records a waveform** file.

A testbench is **never** turned into hardware, so it can use simulation-only features like delays (`#1`) and `$display`.

## 6.2 Our testbench, piece by piece

File: [`verilog/tb_vending_machine.v`](../../verilog/tb_vending_machine.v)

### Signals

```verilog
reg        clk = 0;
reg        rst = 1;
reg  [1:0] coin = 0;
...
wire [7:0] amount, price, change, refund;
wire       dispense, sold_out;
```

- Things the testbench **drives** (inputs to our design) are `reg`.
- Things it only **watches** (outputs of our design) are `wire`.

### Placing the design inside (instantiation)

```verilog
vending_machine dut (
    .clk(clk), .rst(rst), .sel_valid(sel_valid), .sel(sel),
    .coin(coin), .cancel(cancel),
    .state(state), .amount(amount), ...
);
```

`dut` = **D**esign **U**nder **T**est. Each `.port(signal)` connects a pin to a testbench wire.

### The clock

```verilog
always #5 clk = ~clk;   // 10 ns clock period
```

Every 5 ns, flip `clk`. So it is high for 5 ns, low for 5 ns → period 10 ns → **100 MHz**.

### Helper tasks

```verilog
task insert(input [1:0] c);
    begin coin = c; @(posedge clk); #1 coin = 0; end
endtask
```

"Insert a coin" means: put the coin code on the `coin` input, **wait for one rising clock edge** (the design reads it there), then wait 1 ns and remove it. So each coin is a clean **one-cycle pulse**. `press()` and `press_cancel()` work the same way.

Why the `#1`? At the exact moment of the clock edge, the flip-flops are updating. Waiting 1 ns afterwards means we read/change signals when everything has settled — this avoids "race conditions" in the simulator.

```verilog
task check(input [255:0] name, input cond);
    begin
        if (cond) $display("PASS : %0s", name);
        else begin $display("FAIL : %0s", name); errors = errors + 1; end
    end
endtask
```

`check` prints PASS if the condition is true, FAIL otherwise, and counts the failures. This makes the testbench **self-checking** — we don't need to look at waveforms to know if the design is right.

### The test scenarios

The `initial` block runs once, top to bottom:

```verilog
$dumpfile("vending.vcd");          // record a waveform
$dumpvars(0, tb_vending_machine);  // record ALL signals
@(posedge clk); @(posedge clk); #1 rst = 0;   // hold reset for 2 cycles
```

Then seven tests, covering **every arrow in the state diagram**:

| Test | What we do | What we check | Path tested |
|---|---|---|---|
| T1 | Buy A (₹10) with ₹10 | goes to WAIT_COIN, dispenses A, change 0, back to IDLE | IDLE→WAIT→DISPENSE→CHANGE→IDLE (exact payment) |
| T2 | Buy B (₹15) with ₹10 + ₹10 | amount 10 after first coin, dispenses B, change ₹5 | WAIT→WAIT (not enough yet), change > 0 |
| T3 | Choose D, insert ₹5, cancel | refund ₹5, back to IDLE, no sale added | WAIT→REFUND→IDLE |
| T4 | Buy D (₹25) with ₹20 + ₹20 | change ₹15 | ₹20 note, large change |
| T5 | Buy A two more times | stock_a becomes 0 | stock counting |
| T6 | Press A again | sold_out = 1, still IDLE | IDLE→IDLE (sold out) |
| T7 | — | total_sales = 10 + 15 + 25 + 10 + 10 = 70 | sales counting, cancel adds nothing |

Testing every arrow of the state diagram is called **transition coverage**.

## 6.3 Running the simulation

Icarus Verilog has two programs:

| Command | What it does | Like |
|---|---|---|
| `iverilog` | **Compiles** Verilog files into a simulation program | `gcc` |
| `vvp` | **Runs** that simulation program | `./a.out` |

```bash
cd verilog
iverilog -o tb tb_vending_machine.v vending_machine.v
vvp tb
```

- `-o tb` → name the output program `tb`.
- List **all** files: the testbench and the design.

Output:

```
VCD info: dumpfile vending.vcd opened for output.
PASS : T1 select A -> WAIT_COIN
PASS : T1 dispense A
PASS : T1 no change
PASS : T1 back to IDLE
PASS : T2 amount = 10
PASS : T2 dispense B
PASS : T2 change = 5
PASS : T3 refund = 5
PASS : T3 back to IDLE, no sale
PASS : T4 change = 15
PASS : T5 stock A = 0
PASS : T6 sold out
PASS : T7 total sales = 70

*** ALL TESTS PASSED ***
```

If you change the design and break something, you will see `FAIL` lines.

**Try it:** change the price of A in `vending_machine.v` from `8'd10` to `8'd5`, run again, and watch tests fail. Then change it back.

## 6.4 Waveforms (`.vcd` files)

A **waveform** is a timing diagram of every signal over time — like an oscilloscope screen. The testbench saves it to `vending.vcd` (**V**alue **C**hange **D**ump — a standard text file format listing every time a signal changes).

Open it with a waveform viewer:

| Viewer | How to get it |
|---|---|
| **GTKWave** | `brew install --cask gtkwave` (Mac) / `sudo apt install gtkwave` (Linux) |
| **Surfer** | https://surfer-project.org (also runs in the browser) |
| **VS Code "WaveTrace"** | VS Code extension, open the `.vcd` file directly |

In the viewer: expand `tb_vending_machine` → `dut`, and add `clk`, `state`, `coin`, `amount`, `dispense`, `change`, `refund`.

### How to read a waveform

```
clk       _/‾\_/‾\_/‾\_/‾\_/‾\_/‾\_
coin      ===00===X=10=X=10=X===00=======
state     ==001===========X=010X=011X=000=
amount    ==0=====X==10===X=20=======X=0==
dispense  _____________________/‾‾‾\_______
change    ==0==========================X=5=X=0==
```

- **Single lines** (like `clk`, `dispense`) are 1-bit signals: high line = 1, low line = 0.
- **Bus signals** (like `state`, `amount`) are drawn as a band with the **value written inside**; an `X`-shaped crossing means the value changed there.
- Check that changes happen **just after rising edges of `clk`** — that's synchronous design working.

**Tip for the report:** take a screenshot of the waveform for test T2 (buying B with ₹10 + ₹10). It shows WAIT → DISPENSE → CHANGE, the `dispense` pulse and `change = 5` in one picture.

The website also draws its own waveform from the simulation output (see file 7), and has a **Download .vcd** button that gives you the waveform of what you just did on the website.

## 6.5 Simulation vs real hardware

The simulation is **cycle-accurate**: it shows exactly which value each register has after each clock edge. It does not show real-world delays of gates (that needs a "timing simulation" after synthesis). For checking that an FSM is logically correct, this kind of simulation (called **functional** or **RTL simulation**) is the standard first step in the industry.

**RTL** = **R**egister **T**ransfer **L**evel: describing a circuit as registers plus the logic that moves data between them on each clock — exactly how our `vending_machine.v` is written.

Next: [07 — How the website runs Verilog](07-how-the-website-runs-verilog.md)
