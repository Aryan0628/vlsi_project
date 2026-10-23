# 1. Project Overview

## What is this project?

We designed the **control circuit of a vending machine** as digital hardware, using the hardware description language **Verilog**.

A vending machine is a perfect example of a digital system that must *remember* things:

- it must remember **which product** you chose,
- it must remember **how much money** you have put in so far,
- it must know **what step** it is at (waiting for selection? waiting for coins? giving the product?).

A circuit that remembers its "step" and moves from one step to another is called a **Finite State Machine (FSM)**. FSMs are one of the most important ideas in digital design (VLSI), and this project is built around one.

To make the design easy to demonstrate, we also built a **website** that looks like a real vending machine. When you press a button on the website, the click is sent to a server that **runs our Verilog code in a real Verilog simulator (Icarus Verilog)**, and the result is shown on the screen. The website does not "fake" the machine — the Verilog decides everything.

## What the machine can do

| Product | Button code | Price |
|---|---|---|
| Cola | A | ₹10 |
| Coffee | B | ₹15 |
| Cookies | C | ₹20 |
| Sandwich | D | ₹25 |

Money accepted: **₹5 coin, ₹10 coin, ₹20 note**.

How you use it:

1. Press a product button (A, B, C or D).
2. Insert money, one coin/note at a time.
3. As soon as the money is **equal to or more than** the price, the product comes out.
4. If you paid extra, the machine returns the **change**.
5. At any time while inserting money, you can press **Cancel** — the machine returns all your money (**refund**).

Extra features (to make it more realistic):

- **Stock count** — each product has 3 pieces. When a product runs out, the machine shows **SOLD OUT** and refuses that selection.
- **Total sales** — the machine keeps a running total of all money earned.

## The big picture

```
 ┌──────────────────┐   click    ┌──────────────────┐  inputs.txt  ┌─────────────────────────┐
 │  Website (React) │ ─────────▶ │  Server (Node.js)│ ───────────▶ │  Icarus Verilog         │
 │  vending machine │            │                  │              │  simulator running      │
 │  UI, state       │ ◀───────── │                  │ ◀─────────── │  vending_machine.v      │
 │  diagram,        │   JSON     │                  │   printed    │  (our hardware design)  │
 │  waveform        │            │                  │   outputs    │                         │
 └──────────────────┘            └──────────────────┘              └─────────────────────────┘
```

- **The VLSI part (the main part)** — `verilog/` folder. The hardware design + testbenches.
- **The server** — a small program that starts the Verilog simulator whenever a button is pressed.
- **The website** — only for display and interaction.

## Why do we "simulate" instead of making a chip?

Real chips (ASICs) cost lakhs of rupees to make, and even FPGA boards are not always available. In industry, **every design is first simulated** — the simulator pretends to be the hardware and shows exactly what the circuit would do, clock by clock. If the simulation is correct, the same Verilog can later be put on an FPGA or turned into a chip (this step is called **synthesis**).

Our Verilog is written in a **synthesizable** style, meaning it could be put on an FPGA without changes.

## Tools used

| Tool | What it is | Why we use it |
|---|---|---|
| **Verilog HDL** | Language to describe hardware | To design the vending machine circuit |
| **Icarus Verilog** (`iverilog`, `vvp`) | Free Verilog simulator | To compile and run our Verilog on a Mac/Linux/Windows |
| **GTKWave / Surfer** | Waveform viewer | To see signals as timing diagrams |
| **Node.js + Express** | JavaScript server | To run the simulator when the website asks |
| **React + Vite** | Website framework | To build the interactive vending machine UI |
| **lucide-react** | Icon library | Icons on the website |

Next: [02 — Digital basics](02-digital-basics.md)
