# 2. Digital Basics (from zero)

Before Verilog, you need a few simple ideas about digital circuits. Everything in our vending machine is made from these.

## 2.1 Bits

A digital circuit works with only two values:

| Value | Meaning | Voltage (roughly) |
|---|---|---|
| `0` | false / off / LOW | 0 V |
| `1` | true / on / HIGH | supply voltage (e.g. 3.3 V) |

One such 0-or-1 value is called a **bit**. A wire in a digital circuit carries one bit.

## 2.2 Binary numbers

To store bigger numbers we put several bits side by side. This is **binary** (base 2).

```
  bit position :   3   2   1   0
  weight       :   8   4   2   1
  bits         :   1   0   1   0     →  8 + 2 = 10
```

| Decimal | 2-bit | 3-bit | 8-bit |
|---|---|---|---|
| 0 | `00` | `000` | `00000000` |
| 1 | `01` | `001` | `00000001` |
| 2 | `10` | `010` | `00000010` |
| 3 | `11` | `011` | `00000011` |
| 4 | — | `100` | `00000100` |
| 15 | — | — | `00001111` |
| 25 | — | — | `00011001` |

How many values can N bits hold? **2ᴺ values: 0 to 2ᴺ − 1.**

| Bits | Range | Used in our project for |
|---|---|---|
| 2 | 0 – 3 | product select (4 products), coin code (4 codes), stock (0–3 pieces) |
| 3 | 0 – 7 | state (we have 5 states) |
| 8 | 0 – 255 | amount, price, change, refund (max ₹44 needed) |
| 16 | 0 – 65 535 | total sales |

A group of bits that carries one number is called a **bus**, e.g. "an 8-bit bus".

## 2.3 Logic gates (combinational logic)

A **logic gate** takes bit inputs and gives a bit output.

| Gate | Symbol in Verilog | Output is 1 when |
|---|---|---|
| NOT | `~a` | a is 0 |
| AND | `a & b` | both are 1 |
| OR | `a \| b` | at least one is 1 |
| XOR | `a ^ b` | exactly one is 1 |

By connecting many gates you can build bigger circuits: **adders** (`+`), **subtractors** (`-`), **comparators** (`>=`, `==`), and **multiplexers** (choose one of many inputs, written as `case` or `? :` in Verilog).

These circuits are called **combinational logic**: the output depends **only on the current inputs**. They have **no memory**. Change the input → output changes almost immediately.

In our project, combinational circuits:
- convert a coin code into its value (`01` → 5, `10` → 10, `11` → 20)
- look up the price of the pressed product
- add the new coin to the amount (`amount + coin_value`)
- compare `new_amount >= price`

## 2.4 Why we need memory

A vending machine must remember things between button presses: "the customer selected B and has already put in ₹10". Combinational logic can't do that. We need **memory elements**.

## 2.5 The clock

A **clock** is a signal that goes 0 → 1 → 0 → 1 … forever, at a fixed speed.

```
clk   ┌──┐  ┌──┐  ┌──┐  ┌──┐
      │  │  │  │  │  │  │  │
    ──┘  └──┘  └──┘  └──┘  └──
      ↑     ↑     ↑     ↑
      rising edges (posedge)
```

The moment it goes from 0 to 1 is called the **rising edge** or **posedge** (positive edge). In our design, **everything that is remembered changes only at the rising edge of the clock**. This keeps the whole circuit in step, like soldiers marching to a drum beat. Circuits that work like this are called **synchronous**.

One full 0→1→0 period is one **clock cycle**. In our simulation one cycle is 10 ns.

## 2.6 The D flip-flop (1 bit of memory)

A **D flip-flop** is the basic memory cell.

```
        ┌──────────┐
  D ───▶│          │
        │   D FF   │───▶ Q
 clk ──▶│>         │
        └──────────┘
```

Rule: **at every rising edge of `clk`, Q becomes whatever D is at that moment. Between edges, Q does not change, whatever D does.**

So Q "remembers" the value of D from the last clock edge.

## 2.7 Registers

Put N flip-flops side by side, all on the same clock, and you get an **N-bit register**. It stores an N-bit number.

In our vending machine, these are registers (memory):

| Register | Bits | Stores |
|---|---|---|
| `state` | 3 | which step the machine is at |
| `amount` | 8 | money inserted so far |
| `price` | 8 | price of the selected product |
| `item` | 2 | which product was selected |
| `sold_out` | 1 | "last selection was sold out" flag |
| `total_sales` | 16 | money earned in total |
| `stock_a` … `stock_d` | 2 each | pieces left of each product |

That is 3 + 8 + 8 + 2 + 1 + 16 + 4×2 = **46 flip-flops** in total.

## 2.8 Sequential logic = memory + combinational logic

Almost every digital system looks like this:

```
             ┌────────────────────────┐
 inputs ───▶ │  Combinational logic   │ ───▶ outputs
         ┌─▶ │ (decide what's next)   │
         │   └───────────┬────────────┘
         │               │ next value
         │         ┌─────▼─────┐
         │         │ Registers │◀── clk
         │         │ (memory)  │
         │         └─────┬─────┘
         └───────────────┘ current value
```

1. The registers hold the **current** values.
2. The combinational logic looks at the inputs + current values and calculates the **next** values.
3. At the next clock edge, the registers load the next values.
4. Repeat forever.

This is called **sequential logic**, and a **Finite State Machine** is exactly this structure. Keep this picture in mind — our whole vending machine is this picture.

## 2.9 Reset

When power is switched on, flip-flops contain random values. A **reset** input forces all registers to a known starting value (e.g. state = IDLE, amount = 0, stock = 3).

Our reset is:
- **active high** — reset happens when `rst = 1`
- **synchronous** — reset happens only at a rising clock edge (not immediately)

Next: [03 — Verilog basics](03-verilog-basics.md)
