# Learn the Project — Start Here

These notes explain the whole project **from zero**. You do not need to know Verilog, FSMs or web development before reading them. Read the files in order — each one builds on the previous one.

| # | File | What you will learn |
|---|---|---|
| 1 | [01-project-overview.md](01-project-overview.md) | What we built, why, and how all the pieces fit together |
| 2 | [02-digital-basics.md](02-digital-basics.md) | Bits, binary, logic gates, clock, flip-flops, registers — the basics behind everything |
| 3 | [03-verilog-basics.md](03-verilog-basics.md) | What Verilog is and every Verilog keyword used in this project |
| 4 | [04-fsm-basics.md](04-fsm-basics.md) | What a Finite State Machine is, Moore vs Mealy, state diagrams and state tables |
| 5 | [05-vending-machine-design.md](05-vending-machine-design.md) | **Our design**, explained block by block and line by line |
| 6 | [06-testbench-and-simulation.md](06-testbench-and-simulation.md) | How we test the design, run the simulator and read waveforms |
| 7 | [07-how-the-website-runs-verilog.md](07-how-the-website-runs-verilog.md) | How a button click on the website becomes a Verilog simulation |
| 8 | [08-frontend.md](08-frontend.md) | The React website, in short |
| 9 | [09-run-and-deploy.md](09-run-and-deploy.md) | How to run it on your laptop and put it online |
| 10 | [10-viva-questions.md](10-viva-questions.md) | Likely viva questions with answers |

**If you only have 30 minutes before the viva:** read file 4 (FSM basics), file 5 (our design) and file 10 (viva questions).

The source files these notes talk about:

```
verilog/vending_machine.v      ← the hardware design (the most important file)
verilog/tb_vending_machine.v   ← testbench that checks the design
verilog/sim_driver.v           ← testbench used by the website
server/index.js                ← runs the simulator for the website
frontend/src/...               ← the website
```
