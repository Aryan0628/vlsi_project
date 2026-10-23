# 3. Verilog Basics

This file explains **every Verilog feature used in our project**, with examples taken from our own code.

## 3.1 What is Verilog?

**Verilog is a Hardware Description Language (HDL).** It looks a bit like the C language, but it is **not a normal program**.

| Normal program (C, Python) | Verilog |
|---|---|
| Lines run **one after another** | Describes **hardware**, where every part works **at the same time** |
| Runs on a CPU | Becomes gates and flip-flops (or is simulated) |
| A variable is memory in RAM | A `wire` is a real wire; a `reg` may become a flip-flop |

When you write Verilog, keep asking: **"What circuit does this line create?"**

Verilog can be used in two ways:
- **Simulation** — a program (Icarus Verilog, ModelSim, Vivado simulator) pretends to be the circuit and shows what happens.
- **Synthesis** — a tool (Vivado, Yosys) turns the Verilog into real gates for an FPGA or chip.

Some Verilog features work **only in simulation** (like `#5` delays, `$display`, `initial`). We use those only in **testbenches**, never in the design itself.

## 3.2 Module — the box

Every circuit in Verilog is a **module**: a box with input and output pins.

```verilog
module vending_machine (
    input  wire       clk,
    input  wire       rst,
    input  wire [1:0] coin,
    output wire       dispense,
    output reg  [7:0] amount
    // ...
);
    // inside: the circuit
endmodule
```

```
             ┌──────────────────┐
   clk  ───▶ │                  │ ───▶ dispense
   rst  ───▶ │  vending_machine │ ───▶ amount[7:0]
 coin[1:0] ─▶│                  │ ───▶ ...
             └──────────────────┘
```

- `input` — a signal coming **into** the box
- `output` — a signal going **out** of the box
- `module name ( ... ); ... endmodule` — start and end of the box

## 3.3 Vectors (buses): `[7:0]`

`[7:0]` means "8 bits, numbered 7 down to 0". Bit 7 is the most significant (biggest weight).

```verilog
input  wire [1:0] coin,     // 2 bits:  coin[1], coin[0]
output reg  [7:0] amount,   // 8 bits:  can store 0..255
output reg  [15:0] total_sales  // 16 bits: 0..65535
```

No brackets means 1 bit: `input wire cancel`.

## 3.4 Writing numbers: `8'd10`, `2'b01`

Format: **`<number of bits>'<base><value>`**

| Written | Bits | Base | Value |
|---|---|---|---|
| `8'd10` | 8 | decimal | 10 |
| `2'b01` | 2 | binary | 1 |
| `3'd4` | 3 | decimal | 4 (= `100`) |
| `16'd0` | 16 | decimal | 0 |
| `1'b1` | 1 | binary | 1 |

Writing the width makes it clear how many wires/flip-flops are used.

## 3.5 `wire` and `reg`

| Type | What it is | How it gets a value |
|---|---|---|
| `wire` | A connection. Has no memory of its own. | Driven by an `assign` or by a module output |
| `reg` | A signal given a value inside an `always` block | Assigned inside `always` |

**Important beginner trap:** `reg` does **not** always mean a flip-flop!
- `reg` assigned in `always @(posedge clk)` → becomes a **flip-flop** (memory).
- `reg` assigned in `always @(*)` → becomes **combinational logic** (no memory).

In our code, `coin_value` is a `reg` but it is pure combinational logic (decoder), while `amount` is a `reg` that becomes 8 flip-flops.

## 3.6 `assign` — continuous assignment (combinational)

```verilog
assign dispense = (state == DISPENSE);
```

This creates a circuit (a comparator) whose output is **always** connected to `dispense`. Whenever `state` changes, `dispense` changes immediately. It is like soldering a wire.

```verilog
wire [7:0] new_amount = amount + coin_value;   // an 8-bit adder
```

This is a short way of writing `wire [7:0] new_amount; assign new_amount = amount + coin_value;` — an **adder circuit**.

## 3.7 The `? :` operator (a 2-to-1 multiplexer)

```verilog
assign refund = (state == REFUND) ? amount : 8'd0;
```

Read it as: **if** `state == REFUND` **then** `refund = amount` **else** `refund = 0`.
In hardware this is a **multiplexer** (a switch that picks one of two inputs).

## 3.8 Operators we use

| Operator | Meaning | Example | Hardware |
|---|---|---|---|
| `+` | add | `amount + coin_value` | adder |
| `-` | subtract | `amount - price` | subtractor |
| `==` | equal? | `state == DISPENSE` | comparator |
| `!=` | not equal? | `coin != 2'b00` | comparator |
| `>=` | greater or equal? | `new_amount >= price` | comparator |
| `!` | logical NOT | `!cancel` | inverter |

## 3.9 `always @(*)` — combinational block

```verilog
reg [7:0] coin_value;
always @(*) begin
    case (coin)
        2'b01:   coin_value = 8'd5;
        2'b10:   coin_value = 8'd10;
        2'b11:   coin_value = 8'd20;
        default: coin_value = 8'd0;
    endcase
end
```

- `@(*)` means "re-calculate whenever **any** input used inside changes".
- The result is **combinational logic** (here, a small decoder/lookup table).
- Use `=` (blocking assignment) here.
- Always give a value in **every** case (that's why we have `default`). If you forget, the tool creates an unwanted memory element called a **latch**.

## 3.10 `case` — choose one of many

```verilog
case (sel)
    2'd0:    sel_price = 8'd10;   // A
    2'd1:    sel_price = 8'd15;   // B
    2'd2:    sel_price = 8'd20;   // C
    default: sel_price = 8'd25;   // D
endcase
```

Like `switch` in C. In hardware it becomes a **multiplexer** — the select lines (`sel`) choose which value comes out.

## 3.11 `always @(posedge clk)` — sequential block (flip-flops)

```verilog
always @(posedge clk) begin
    if (rst) begin
        amount <= 8'd0;
    end else begin
        amount <= new_amount;
    end
end
```

- `@(posedge clk)` means "do this **only at the rising edge of the clock**".
- Every `reg` assigned here becomes **flip-flops**.
- Use `<=` (non-blocking assignment) here.

## 3.12 `=` vs `<=` (blocking vs non-blocking)

This is a favourite viva question.

| | `=` blocking | `<=` non-blocking |
|---|---|---|
| Where to use | `always @(*)` (combinational) | `always @(posedge clk)` (sequential) |
| Behaviour | Updates **immediately**, next line sees the new value | All right-hand sides are read **first**, then all left-hand sides update **together at the end** |
| Matches hardware | gates | flip-flops (they all update at the same clock edge) |

Example of why `<=` matters:

```verilog
// with <= : a and b SWAP at the clock edge (like real flip-flops)
always @(posedge clk) begin
    a <= b;
    b <= a;
end
```

With `=`, both would end up with the same value, which is not what two real flip-flops do.

**Simple rule: clocked block → `<=`. Combinational block → `=`.** Our code follows this rule everywhere.

## 3.13 `if / else` and `begin / end`

```verilog
if (cancel)
    state <= REFUND;
else if (coin != 2'b00) begin
    amount <= new_amount;
    if (new_amount >= price)
        state <= DISPENSE;
end
```

- `begin ... end` groups several statements (like `{ }` in C). Needed only when there is more than one statement.
- In hardware, `if/else` becomes **multiplexers / enable logic** in front of the flip-flops.

## 3.14 `localparam` — named constants

```verilog
localparam IDLE      = 3'd0;
localparam WAIT_COIN = 3'd1;
```

Gives a **name** to a number, so we can write `state <= WAIT_COIN` instead of `state <= 3'd1`. It creates no hardware; it just makes the code readable.

## 3.15 Comments

```verilog
// single-line comment
/* multi-line
   comment */
```

## 3.16 Testbench-only features (simulation only)

These appear in `tb_vending_machine.v` and `sim_driver.v`, **not** in the design:

| Feature | Meaning |
|---|---|
| `` `timescale 1ns/1ps `` | `#1` means 1 nanosecond; precision 1 picosecond |
| `initial begin ... end` | Runs **once** at the start of simulation (used to give inputs step by step) |
| `#5` | Wait 5 time units (5 ns) |
| `always #5 clk = ~clk;` | Flip the clock every 5 ns → 10 ns period clock |
| `@(posedge clk)` | Wait until the next rising edge |
| `$display("...")` | Print a message (like `printf`) |
| `$dumpfile / $dumpvars` | Save all signals to a `.vcd` waveform file |
| `$fopen / $fscanf / $feof` | Read inputs from a text file |
| `$finish` | End the simulation |
| `task ... endtask` | A reusable group of steps (like a function) |

## 3.17 Instantiation — using a module inside another

The testbench "places" our vending machine inside it and connects wires to its pins:

```verilog
vending_machine dut (
    .clk(clk),          // .pin_name(signal_in_testbench)
    .rst(rst),
    .coin(coin),
    .dispense(dispense),
    // ...
);
```

`dut` is the instance name ("Design Under Test"). This is how big chips are built: modules inside modules.

Next: [04 — FSM basics](04-fsm-basics.md)
