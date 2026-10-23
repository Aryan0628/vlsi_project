# 9. Run and Deploy

## 9.1 Install once (macOS)

```bash
brew install icarus-verilog   # Verilog simulator (iverilog + vvp)
brew install node             # if Node.js is not installed
```

Linux: `sudo apt install iverilog nodejs npm`.
Windows: install Icarus Verilog from https://bleyer.org/icarus/ and Node.js from https://nodejs.org.

## 9.2 Only the Verilog (no website)

```bash
cd verilog
iverilog -o tb tb_vending_machine.v vending_machine.v
vvp tb
```

You should see `*** ALL TESTS PASSED ***`. Open `vending.vcd` in GTKWave/Surfer to see the waveforms.

### In Vivado (college lab) or EDA Playground

The Verilog uses only standard Verilog-2001, so it works unchanged:
- **Vivado:** create a project → add `vending_machine.v` as a **design source** and `tb_vending_machine.v` as a **simulation source** → Run Simulation → Run Behavioral Simulation. You can also click **Run Synthesis** → **Open Synthesized Design → Schematic** to see the actual gates and flip-flops generated — great for the report.
- **EDA Playground** (https://edaplayground.com): paste the design on the right, testbench on the left, choose *Icarus Verilog*, tick *Open EPWave after run*, click Run.

## 9.3 Full project on your laptop

Two terminals:

```bash
# terminal 1 — server (runs the Verilog)
cd server
npm install
npm start            # → Server running on http://localhost:3001
```

```bash
# terminal 2 — website
cd frontend
npm install
npm run dev          # → open http://localhost:5173
```

## 9.4 Put it online (Render)

The website needs a server that can run Icarus Verilog, so a static-only host (like Vercel/Netlify alone) is not enough. We use **Render** with the `Dockerfile` in the project root. The Dockerfile:

1. builds the React website,
2. installs Icarus Verilog on Linux,
3. starts the Node server, which serves both the website and the API.

Steps:
1. Push the project folder to a GitHub repository.
2. On https://render.com → **New → Web Service** → choose the repo.
3. Render detects the Dockerfile (Language: Docker). Choose the **Free** plan → **Deploy**.
4. Open the `https://<name>.onrender.com` link when the build finishes.

Free services sleep after ~15 minutes without visitors; the first visit after that takes about a minute. Open the link a few minutes before your presentation, and keep the local version ready as a backup.

Next: [10 — Viva questions](10-viva-questions.md)
