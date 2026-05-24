#!/usr/bin/env node
/**
 * logica — UserPromptSubmit hook
 * Detecteert /logica commando's, schrijft mode naar ~/.logica-active,
 * toont statusberichten en handelt expand/stats af.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const FLAG      = path.join(os.homedir(), '.logica-active');
const STATS_LOG = path.join(os.homedir(), '.logica-stats.json');

let input = '';
process.stdin.on('data', d => input += d);
process.stdin.on('end', () => {
  let prompt = '';
  try {
    const parsed = JSON.parse(input);
    prompt = (parsed.prompt || parsed.message || parsed.text || '').toLowerCase().trim();
  } catch {
    prompt = input.toLowerCase().trim();
  }

  const isOff     = /^\/logica\s+off$/.test(prompt) || prompt === 'normaal mode' || prompt === 'stop logica';
  const isUltra   = /^\/logica\s+ultra$/.test(prompt);
  const isLite    = /^\/logica\s+lite$/.test(prompt);
  const isFull    = /^\/(logica|logica\s+full)$/.test(prompt) || prompt.includes('logica modus') || prompt.includes('minder tokens');
  const isExpand  = /^\/logica\s+expand$/.test(prompt);
  const isStats   = /^\/logica\s+stats$/.test(prompt);

  if (isOff) {
    try { fs.unlinkSync(FLAG); } catch {}
    out({ statusMessage: '⬜ logica: off' });
  } else if (isUltra) {
    fs.writeFileSync(FLAG, 'ultra');
    out({ statusMessage: '🪨 logica: ULTRA actief' });
  } else if (isLite) {
    fs.writeFileSync(FLAG, 'lite');
    out({ statusMessage: '🔵 logica: LITE actief' });
  } else if (isFull) {
    fs.writeFileSync(FLAG, 'full');
    out({ statusMessage: '🟢 logica: FULL actief' });
  } else if (isExpand) {
    // Signaleer aan Claude: expand modus — geen XML, leesbaar Nederlands
    out({ statusMessage: '📖 logica: expand — herschrijf naar leesbaar NL' });
  } else if (isStats) {
    const stats = leesStats();
    out({ statusMessage: `📊 logica: ~${stats.sessie} tokens bespaard deze sessie` });
  } else {
    // Gewone prompt — tel sessie-tokens bij (ruwe schatting: 4 chars/token)
    const woorden = prompt.split(/\s+/).length;
    const mode    = huidigeMode();
    if (mode) {
      const reductie = mode === 'ultra' ? 0.75 : mode === 'lite' ? 0.30 : 0.55;
      slaStatsOp(Math.round(woorden * reductie));
    }
    out({ statusMessage: '' });
  }
});

function out(obj) {
  process.stdout.write(JSON.stringify(obj));
  process.exit(0);
}

function huidigeMode() {
  try { return fs.readFileSync(FLAG, 'utf8').trim(); } catch { return null; }
}

function leesStats() {
  try {
    const data = JSON.parse(fs.readFileSync(STATS_LOG, 'utf8'));
    return { sessie: data.sessie || 0, totaal: data.totaal || 0 };
  } catch {
    return { sessie: 0, totaal: 0 };
  }
}

function slaStatsOp(bespaard) {
  const stats = leesStats();
  stats.sessie = (stats.sessie || 0) + bespaard;
  stats.totaal = (stats.totaal || 0) + bespaard;
  try { fs.writeFileSync(STATS_LOG, JSON.stringify(stats)); } catch {}
}
