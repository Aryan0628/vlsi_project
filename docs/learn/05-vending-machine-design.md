# 5. Our Vending Machine Design — Explained Line by Line

File: [`verilog/vending_machine.v`](../../verilog/vending_machine.v)

Keep that file open next to this one. We go through it from top to bottom.

## 5.1 Block diagram

```
                       ┌─────────────────────────────────────────────────┐
                       │                vending_machine                  │
                       │                                                 │
  coin[1:0] ──────────▶│─▶ Coin decoder ──▶ coin_value ─┐                │
                       │                                ▼                │
                       │                         ┌──────────┐            │
                       │            amount ────▶ │  Adder   │─ new_amount│
                       │                         └──────────┘     │      │
  sel[1:0] ───────────▶│─▶ Price lookup ─▶ sel_price               │      │
                       │─▶ Stock lookup ─▶ sel_stock               ▼      │
  sel_valid ──────────▶│                ┌───────────────────────────────┐│
  cancel ─────────────▶│───────────────▶│  FSM: next-state & register   ││──▶ state[2:0]
  clk, rst ───────────▶│───────────────▶│  update logic                 ││──▶ amount, price, item
                       │                │  (always @(posedge clk))      ││──▶ sold_out, total_sales
                       │                │                               ││──▶ stock_a..stock_d
                       │                └───────────────┬───────────────┘│
                       │                                ▼                │
                       │                      ┌──────────────────┐       │
                       │                      │ Moore output     │───────│──▶ dispense
                       │                      │ logic (assign)   │───────│──▶ change[7:0]
                       │                      └──────────────────┘───────│──▶ refund[7:0]
                       └─────────────────────────────────────────────────┘
```

## 5.2 Inputs and outputs (the ports)

### Inputs

| Port | Width | Meaning |
|---|---|---|
| `clk` | 1 | Clock. Everything updates at its rising edge. |
| `rst` | 1 | Reset (active high, synchronous). Puts the machine in its starting condition. |
| `sel_valid` | 1 | 1 = a product button is being pressed this cycle |
| `sel` | 2 | Which product: `00`=A, `01`=B, `10`=C, `11`=D |
| `coin` | 2 | Money inserted this cycle: `00`=nothing, `01`=₹5, `10`=₹10, `11`=₹20 |
| `cancel` | 1 | 1 = cancel button pressed |

Why both `sel_valid` and `sel`? Because `sel = 00` is a real product (A). We need a separate bit that says "a button is actually pressed now". This "data + valid" pattern is very common in real hardware.

Why is `coin` a 2-bit code and not the actual rupee value? Because a real coin acceptor sensor reports *which* coin it detected, not a number. 2 bits are enough for 3 coin types + "no coin". The design converts it to a value inside (the coin decoder).

### Outputs

| Port | Width | Kind | Meaning |
|---|---|---|---|
| `state` | 3 | register | Current FSM state (shown for debugging/display) |
| `amount` | 8 | register | Money inserted so far |
| `price` | 8 | register | Price of the selected product |
| `item` | 2 | register | Selected product |
| `dispense` | 1 | combinational | 1 = drop the product (would drive a motor) |
| `change` | 8 | combinational | Change to return |
| `refund` | 8 | combinational | Money to return after cancel |
| `sold_out` | 1 | register | 1 = the last product pressed is out of stock |
| `total_sales` | 16 | register | Total money earned |
| `stock_a` … `stock_d` | 2 each | register | Pieces left (start at 3) |

### Why these widths?

- **amount = 8 bits.** The largest amount possible: while waiting, amount is always below the price (max price ₹25, so at most ₹20 when coins are multiples of 5). Adding the biggest note (₹20) gives at most ₹40. That fits in 8 bits (max 255). 6 bits (max 63) would also work, but 8 bits is a standard byte and leaves room for higher prices.
- **total_sales = 16 bits.** With 3 pieces of each product, the most the machine can earn is 3 × (10 + 15 + 20 + 25) = ₹210, but 16 bits (max ₹65 535) allows refilling later.
- **stock = 2 bits.** Holds 0–3, exactly our 3 pieces.
- **state = 3 bits.** 5 states need at least 3 bits (see [file 4, section 4.7](04-fsm-basics.md#47-state-encoding)).

## 5.3 Part 1 — State names (`localparam`)

```verilog
localparam IDLE      = 3'd0;  // waiting for product selection
localparam WAIT_COIN = 3'd1;  // waiting for enough money
localparam DISPENSE  = 3'd2;  // give out the product
localparam CHANGE    = 3'd3;  // give back extra money
localparam REFUND    = 3'd4;  // cancel pressed, return all money
```

Just names for the 3-bit state codes. No hardware is made here.

## 5.4 Part 2 — Coin decoder (combinational)

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

Converts the 2-bit coin **code** into the rupee **value**.

| coin | coin_value |
|---|---|
| 00 | 0 |
| 01 | 5 |
| 10 | 10 |
| 11 | 20 |

It is a tiny lookup table (a 4-input multiplexer). `always @(*)` + `=` + `default` → pure combinational logic, no latch.

## 5.5 Part 3 — Price lookup (combinational)

```verilog
reg [7:0] sel_price;
always @(*) begin
    case (sel)
        2'd0:    sel_price = 8'd10;   // A
        2'd1:    sel_price = 8'd15;   // B
        2'd2:    sel_price = 8'd20;   // C
        default: sel_price = 8'd25;   // D
    endcase
end
```

Gives the price of whichever button `sel` points to. To change a price, you change only this table.

## 5.6 Part 4 — Stock lookup (combinational)

```verilog
reg [1:0] sel_stock;
always @(*) begin
    case (sel)
        2'd0:    sel_stock = stock_a;
        2'd1:    sel_stock = stock_b;
        2'd2:    sel_stock = stock_c;
        default: sel_stock = stock_d;
    endcase
end
```

A multiplexer that picks the stock count of the pressed product, so the FSM can check "is it sold out?" with one comparison.

## 5.7 Part 5 — The adder

```verilog
wire [7:0] new_amount = amount + coin_value;
```

An 8-bit adder. `new_amount` is "what the amount **will be** if we accept this coin". We need it **before** the clock edge so we can decide, in the same cycle, whether the money is now enough (`new_amount >= price`). If we compared the old `amount` instead, the machine would need one extra clock cycle to notice it has been paid.

## 5.8 Part 6 — Moore outputs

```verilog
assign dispense = (state == DISPENSE);
assign change   = (state == CHANGE) ? (amount - price) : 8'd0;
assign refund   = (state == REFUND) ? amount           : 8'd0;
```

- `dispense` is 1 for exactly one clock cycle — the cycle the machine is in DISPENSE.
- `change` shows `amount − price` only in the CHANGE state, otherwise 0. Hardware: a subtractor + a multiplexer.
- `refund` shows the full `amount` only in the REFUND state, otherwise 0.

Because they are decided by the state, these outputs are **clean pulses**, one clock long, at fixed times. A real machine would use these pulses to start the product motor and the coin-return mechanism.

## 5.9 Part 7 — The FSM (the heart of the design)

Everything that must be **remembered** is updated in one clocked block:

```verilog
always @(posedge clk) begin
    if (rst) begin
        ... reset values ...
    end else begin
        case (state)
            IDLE:      ...
            WAIT_COIN: ...
            DISPENSE:  ...
            CHANGE:    ...
            REFUND:    ...
            default:   state <= IDLE;
        endcase
    end
end
```

`always @(posedge clk)` → all these registers are flip-flops that change only at the rising clock edge. We use `<=` everywhere here.

> **Note:** In [file 4](04-fsm-basics.md#43-parts-of-every-fsm) we drew the next-state logic and the state register as separate boxes. Here we wrote them **together in one `always` block** (the "one-process" FSM style). This is shorter and easier to read; the synthesis tool still builds exactly the same picture — combinational logic in front of flip-flops.

### Reset

```verilog
if (rst) begin
    state       <= IDLE;
    amount      <= 8'd0;
    price       <= 8'd0;
    item        <= 2'd0;
    sold_out    <= 1'b0;
    total_sales <= 16'd0;
    stock_a     <= 2'd3;
    stock_b     <= 2'd3;
    stock_c     <= 2'd3;
    stock_d     <= 2'd3;
end
```

At power-on, every register gets a known value. Each product starts with 3 pieces.

### State IDLE — waiting for a product button

```verilog
IDLE: begin
    if (sel_valid) begin
        if (sel_stock == 2'd0) begin
            sold_out <= 1'b1;          // reject, stay in IDLE
        end else begin
            sold_out <= 1'b0;
            item     <= sel;
            price    <= sel_price;
            amount   <= 8'd0;
            state    <= WAIT_COIN;
        end
    end
end
```

- Nothing pressed → nothing changes, we stay in IDLE.
- Button pressed but that product's stock is 0 → set `sold_out = 1` and **stay** in IDLE.
- Button pressed and stock available →
  - **remember** which product (`item <= sel`) and its price (`price <= sel_price`),
  - start counting money from 0,
  - go to WAIT_COIN.

Why save `item` and `price` in registers? Because `sel` is only valid while the button is pressed. Once the customer lets go, we still need to know what they chose. **This is exactly why we need memory.**

Coins inserted while in IDLE are ignored (the machine has not been told what to sell yet).

### State WAIT_COIN — collecting money

```verilog
WAIT_COIN: begin
    if (cancel)
        state <= REFUND;
    else if (coin != 2'b00) begin
        amount <= new_amount;
        if (new_amount >= price)
            state <= DISPENSE;
    end
end
```

- **Cancel has the highest priority** (it is checked first). If cancel and a coin come in the same cycle, the coin is ignored and we refund what was already inserted.
- If a coin arrives: add it to `amount`.
  - If the new total is enough → go to DISPENSE.
  - If not → stay in WAIT_COIN and wait for more coins.
- If nothing happens → stay here (the customer is searching their pocket).

Product buttons pressed here are ignored — to choose another product, the customer cancels first.

### State DISPENSE — give the product

```verilog
DISPENSE: begin
    case (item)
        2'd0: stock_a <= stock_a - 2'd1;
        2'd1: stock_b <= stock_b - 2'd1;
        2'd2: stock_c <= stock_c - 2'd1;
        2'd3: stock_d <= stock_d - 2'd1;
    endcase
    total_sales <= total_sales + price;
    state       <= CHANGE;
end
```

- While in this state, the output `dispense = 1` (from the `assign`).
- One piece is removed from the stock of the chosen product.
- The price is added to the total sales.
- Next clock: go to CHANGE. No input is needed — this happens automatically.

### State CHANGE — return extra money

```verilog
CHANGE: begin
    amount <= 8'd0;
    state  <= IDLE;
end
```

- While in this state, the output `change = amount − price` (from the `assign`).
  The `amount` register still holds the paid money during this cycle, so the subtraction is correct.
- At the next edge, clear `amount` and go back to IDLE, ready for the next customer.
- If the customer paid exactly, `change = 0`.

### State REFUND — cancel was pressed

```verilog
REFUND: begin
    amount <= 8'd0;
    state  <= IDLE;
end
```

- While in this state, the output `refund = amount`.
- Then clear `amount` and return to IDLE. No sale is recorded; stock does not change.

### Default — safety

```verilog
default: state <= IDLE;
```

The 3-bit state can hold 8 values but we use only 5. If the state ever becomes 5, 6 or 7 (illegal), the machine goes back to IDLE instead of getting stuck.

## 5.10 Worked example — buying Coffee (₹15) with ₹10 + ₹10

This is the **actual output** of our simulation. Each row is one clock edge.

| Cycle | Input at this edge | State after edge | amount | price | dispense | change | stock_b | total_sales |
|---|---|---|---|---|---|---|---|---|
| 0 | press **B** | WAIT_COIN | 0 | 15 | 0 | 0 | 3 | 0 |
| 1 | coin ₹10 | WAIT_COIN | 10 | 15 | 0 | 0 | 3 | 0 |
| 2 | coin ₹10 | **DISPENSE** | 20 | 15 | **1** | 0 | 3 | 0 |
| 3 | — | **CHANGE** | 20 | 15 | 0 | **5** | 2 | 15 |
| 4 | — | IDLE | 0 | 15 | 0 | 0 | 2 | 15 |

Follow it:
- **Cycle 0:** B is in stock → save item = B, price = 15 → go to WAIT_COIN.
- **Cycle 1:** 0 + 10 = 10, and 10 < 15 → stay in WAIT_COIN.
- **Cycle 2:** 10 + 10 = 20, and 20 ≥ 15 → go to DISPENSE. Now `dispense = 1`.
- **Cycle 3:** DISPENSE has reduced stock_b to 2 and added 15 to total_sales → now in CHANGE, `change = 20 − 15 = 5`.
- **Cycle 4:** amount cleared → back to IDLE.

Timing diagram of the same thing:

```
cycle      0      1      2      3      4
clk      _/‾\_ _/‾\_ _/‾\_ _/‾\_ _/‾\_
state    WAIT  | WAIT | DISP | CHG  | IDLE
amount     0   |  10  |  20  |  20  |  0
dispense ______________/‾‾‾‾‾‾\_____________
change     0   |   0  |   0  |   5  |  0
```

## 5.11 Hardware cost (rough)

| Item | Count |
|---|---|
| Flip-flops | 46 (state 3, amount 8, price 8, item 2, sold_out 1, total_sales 16, stocks 4×2) |
| Adders | 8-bit (amount + coin), 16-bit (total_sales + price) |
| Subtractors | 8-bit (amount − price), 4 × 2-bit (stock − 1) |
| Comparators | `>=` (8-bit), several `==` for state checks |
| Multiplexers | coin decoder, price lookup, stock lookup, output muxes |

This is a small design — it would use a tiny fraction of even the smallest FPGA.

## 5.12 Design choices and their reasons

| Choice | Reason |
|---|---|
| Moore FSM | Outputs are clean one-cycle pulses, no glitches from inputs |
| Synchronous reset | Everything changes only on the clock edge — simple and predictable |
| Binary state encoding | Fewest flip-flops (3); easy to read in waveforms |
| `new_amount` computed before the edge | Detect "paid enough" in the same cycle the coin arrives |
| Cancel checked before coin | Customer's cancel should always win |
| `default` branch | Recovers from illegal states |
| Separate `sel_valid` | Product A has code `00`, so we need a separate "button pressed" signal |

## 5.13 Limitations (good to mention honestly in the viva)

- The machine assumes it **always has coins for change**. A real machine would check its coin stock and refuse if it can't give change.
- Coins inserted in IDLE (before choosing) are simply ignored; a real machine would push them back out.
- There is **no refill** input; stock only goes down until reset.
- Inputs are assumed to be **clean one-clock pulses**. Real push-buttons "bounce" and are not synchronised to the clock; a real design would add a **debouncer** and a **2-flip-flop synchroniser** in front of each button.

These are good "future scope" points.

Next: [06 — Testbench and simulation](06-testbench-and-simulation.md)
