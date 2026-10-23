# 10. Viva Questions and Answers

## About the project

**Q1. What is your project?**
A vending machine controller designed as a Finite State Machine in Verilog HDL. It accepts ₹5, ₹10 and ₹20, sells 4 products (₹10–₹25), returns change, supports cancel/refund, tracks stock and total sales. It is verified with a self-checking testbench in Icarus Verilog, and a React website lets you operate it — every click is simulated on the actual Verilog.

**Q2. Why is a vending machine a good FSM example?**
It goes through a fixed sequence of steps (wait for selection → wait for money → dispense → return change) and must remember what step it is at and how much money was inserted. Those steps are states; buttons and coins are inputs.

**Q3. How many states? Name them.**
Five: IDLE (000), WAIT_COIN (001), DISPENSE (010), CHANGE (011), REFUND (100).

**Q4. How many flip-flops are needed for the state?**
⌈log₂ 5⌉ = 3 flip-flops (binary encoding). With one-hot encoding it would be 5.

**Q5. How many flip-flops in the whole design?**
46: state 3 + amount 8 + price 8 + item 2 + sold_out 1 + total_sales 16 + stock 4×2.

## FSM theory

**Q6. Is your machine Moore or Mealy? Why?**
Moore. The outputs `dispense`, `change` and `refund` depend only on the current state (and stored registers), not directly on the inputs. So they change only at clock edges and are clean one-cycle pulses without glitches.

**Q7. Difference between Moore and Mealy?**
Moore: output = f(state). Mealy: output = f(state, input). Mealy usually needs fewer states and reacts in the same cycle, but outputs can glitch when inputs change. Moore outputs are delayed by one cycle but are stable.

**Q8. What happens with the unused state codes 101, 110, 111?**
The `default: state <= IDLE;` branch sends the machine back to IDLE, so it can never get stuck in an illegal state.

**Q9. What is one-hot encoding? When would you use it?**
One flip-flop per state, exactly one is 1. It uses more flip-flops but the next-state logic is simpler and faster. It is popular on FPGAs, which have many flip-flops.

## Verilog

**Q10. Difference between `=` and `<=`?**
`=` is blocking: updates immediately, used in combinational `always @(*)`. `<=` is non-blocking: all right-hand sides are evaluated first and all left-hand sides update together, like flip-flops on a clock edge; used in `always @(posedge clk)`.

**Q11. Difference between `wire` and `reg`?**
`wire` is a connection driven by `assign` or a module output; it can't hold a value by itself. `reg` is assigned inside an `always` block. A `reg` becomes a flip-flop only if assigned in a clocked block; in `always @(*)` it becomes combinational logic.

**Q12. What is a latch and how did you avoid it?**
A latch is an unwanted memory element created when a combinational block doesn't assign a value in every case. We avoid it by having a `default` in every `case` inside `always @(*)`.

**Q13. Synchronous vs asynchronous reset — which did you use?**
Synchronous, active-high: reset happens only at the rising clock edge when `rst = 1`. It is written as `if (rst)` inside `always @(posedge clk)`. An asynchronous reset would be written `always @(posedge clk or posedge rst)` and acts immediately.

**Q14. What is `localparam`?**
A named constant inside a module, e.g. `localparam IDLE = 3'd0;`. It makes the code readable and creates no hardware.

**Q15. Is your design synthesizable?**
Yes. The design file uses only synthesizable constructs (`always @(posedge clk)`, `always @(*)`, `assign`, `case`, `if`). Simulation-only features like `#` delays, `$display` and file reading are used only in testbenches.

**Q16. What does `8'd15` mean?**
An 8-bit number, written in decimal, value 15 (binary `00001111`).

## Design decisions

**Q17. Why do you use `sel_valid` along with `sel`?**
`sel = 00` is a valid product (A), so we need a separate signal to say "a button is actually pressed now".

**Q18. Why compute `new_amount = amount + coin_value` combinationally?**
So that in the same clock cycle the coin arrives, we can compare `new_amount >= price` and go directly to DISPENSE. Comparing the old `amount` would waste one clock cycle.

**Q19. What if cancel and a coin come at the same time?**
Cancel is checked first, so it wins: the machine goes to REFUND and that coin is not added.

**Q20. Why save `item` and `price` in registers?**
`sel` is only valid while the button is pressed. The machine must remember the choice for the rest of the transaction, so it is stored in registers.

**Q21. Why is `amount` 8 bits?**
The maximum possible amount is ₹40 (₹20 already inserted + ₹20 note). 8 bits (0–255) is more than enough and is a standard byte.

**Q22. How does sold-out work?**
Each product has a 2-bit stock register starting at 3. In DISPENSE we subtract 1. In IDLE, if the pressed product's stock is 0, we set `sold_out = 1` and stay in IDLE.

## Verification

**Q23. What is a testbench?**
A Verilog module with no ports that creates the clock, drives inputs to the design, checks the outputs and records waveforms. It is used only for simulation.

**Q24. How did you verify the design?**
A self-checking testbench with 7 tests (13 checks) that covers every transition in the state diagram: exact payment, overpayment with change, cancel/refund, ₹20 note, stock reaching 0, sold-out, and total sales. All pass. We also inspected the waveforms.

**Q25. What is a VCD file?**
Value Change Dump — a standard text file that records every change of every signal with its time. Waveform viewers like GTKWave read it.

**Q26. What does `iverilog` do and what does `vvp` do?**
`iverilog` compiles the Verilog files into a simulation program; `vvp` runs that program.

**Q27. What is RTL?**
Register Transfer Level — describing hardware as registers and the logic that moves data between them on each clock edge. Our design is written at RTL.

## Website part

**Q28. Is the website just an animation?**
No. Each click is sent to a Node.js server that writes the inputs to a file and runs our Verilog in Icarus Verilog. The website displays the outputs printed by the simulation, cycle by cycle.

**Q29. How does the server remember the machine's state between clicks?**
It doesn't. It replays all actions from reset each time. Since hardware is deterministic, the result is the same as a continuously running machine.

## Improvements / future scope

**Q30. What would you add for a real machine?**
- Check whether the machine has enough coins to give change.
- Return coins inserted before a product is selected.
- A refill/restock input and admin mode.
- Button **debouncing** and **synchronisers** for real push-buttons.
- Implement on an FPGA board (e.g. Basys 3): switches for coins, buttons for products, LEDs for dispense, 7-segment display for amount.
- Display the amount on a 7-segment display using a binary-to-BCD converter.
