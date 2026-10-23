// ============================================================
//  Backend: runs the Verilog vending machine using Icarus Verilog
//
//  1. On startup  : compile vending_machine.v + sim_driver.v  -> sim.out
//  2. Each request: the UI sends ALL user actions so far.
//                   We write them to inputs.txt (one line per clock),
//                   run "vvp sim.out", parse the printed CYCLE lines
//                   and send them back as JSON.
//  The server keeps no machine state - the Verilog is replayed from reset.
// ============================================================
import express from 'express';
import cors from 'cors';
import { execFileSync, execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = process.env.PORT || 3001; // hosting sites set PORT themselves
const IDLE_CYCLES = 3; // empty clock cycles after each action so the FSM can finish

const here = path.dirname(fileURLToPath(import.meta.url));
const verilogDir = path.join(here, '..', 'verilog');
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vending-'));
const simBinary = path.join(workDir, 'sim.out');
const lastVcd = path.join(workDir, 'last.vcd');

// ---------- 1. compile Verilog once ----------
try {
  execFileSync('iverilog', [
    '-o', simBinary,
    path.join(verilogDir, 'vending_machine.v'),
    path.join(verilogDir, 'sim_driver.v'),
  ]);
  console.log('Verilog compiled OK');
} catch (err) {
  console.error('Verilog compile failed. Is Icarus Verilog installed? (brew install icarus-verilog)');
  console.error(err.stderr?.toString() || err.message);
  process.exit(1);
}

// ---------- action -> input line "sel_valid sel coin cancel" ----------
const COIN_CODE = { 5: 1, 10: 2, 20: 3 };

function actionToLine(action) {
  if (action.type === 'select') return `1 ${action.item} 0 0`;
  if (action.type === 'coin') return `0 0 ${COIN_CODE[action.value]} 0`;
  if (action.type === 'cancel') return '0 0 0 1';
  return null;
}

function isValidAction(a) {
  if (!a || typeof a !== 'object') return false;
  if (a.type === 'select') return Number.isInteger(a.item) && a.item >= 0 && a.item <= 3;
  if (a.type === 'coin') return a.value in COIN_CODE;
  return a.type === 'cancel';
}

// ---------- parse one "CYCLE ..." line printed by sim_driver.v ----------
function parseCycle(line) {
  const [left, right] = line.replace('CYCLE ', '').split('|');
  const [cycle, selValid, sel, coin, cancel] = left.trim().split(/\s+/).map(Number);
  const [state, amount, price, item, dispense, change, refund, soldOut, totalSales,
    stockA, stockB, stockC, stockD] = right.trim().split(/\s+/).map(Number);
  return {
    cycle,
    inputs: { selValid, sel, coin, cancel },
    state, amount, price, item, dispense, change, refund, soldOut, totalSales,
    stock: [stockA, stockB, stockC, stockD],
  };
}

function runSimulation(actions) {
  return new Promise((resolve, reject) => {
    const runDir = fs.mkdtempSync(path.join(workDir, 'run-'));
    const inFile = path.join(runDir, 'inputs.txt');
    const vcdFile = path.join(runDir, 'wave.vcd');

    // each action = 1 cycle, followed by a few idle cycles
    const lines = [];
    const actionStart = []; // index of first cycle that belongs to each action
    for (const a of actions) {
      actionStart.push(lines.length);
      lines.push(actionToLine(a));
      for (let i = 0; i < IDLE_CYCLES; i++) lines.push('0 0 0 0');
    }
    fs.writeFileSync(inFile, lines.join('\n') + '\n');

    execFile('vvp', [simBinary, `+IN=${inFile}`, `+VCD=${vcdFile}`], { cwd: runDir }, (err, stdout) => {
      if (err) {
        fs.rmSync(runDir, { recursive: true, force: true });
        return reject(err);
      }
      const trace = stdout.split('\n').filter((l) => l.startsWith('CYCLE')).map(parseCycle);
      fs.copyFileSync(vcdFile, lastVcd);
      fs.rmSync(runDir, { recursive: true, force: true });
      resolve({ trace, actionStart });
    });
  });
}

// ---------- HTTP API ----------
const app = express();
app.use(cors());
app.use(express.json());

// POST /api/simulate  { actions: [{type:'select', item:1}, {type:'coin', value:10}, ...] }
app.post('/api/simulate', async (req, res) => {
  const actions = req.body?.actions;
  if (!Array.isArray(actions) || actions.length > 500 || !actions.every(isValidAction)) {
    return res.status(400).json({ error: 'Invalid actions list' });
  }
  try {
    res.json(await runSimulation(actions));
  } catch (err) {
    res.status(500).json({ error: 'Simulation failed', detail: err.message });
  }
});

// GET /api/vcd  -> download waveform of the last run (open in GTKWave / Surfer)
app.get('/api/vcd', (req, res) => {
  if (!fs.existsSync(lastVcd)) return res.status(404).send('No simulation run yet');
  res.download(lastVcd, 'vending_machine.vcd');
});

// In production, the same server also serves the built React app (frontend/dist)
const frontendDist = path.join(here, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => res.sendFile(path.join(frontendDist, 'index.html')));
}

app.listen(PORT,() => console.log(`Server running on http://localhost:${PORT}`));
