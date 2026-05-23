#!/usr/bin/env node
/**
 * logica — UserPromptSubmit hook
 * Detecteert /logica commando's en schrijft mode naar ~/.logica-active
 * Zodat de volgende SessionStart hook weet welke mode actief is.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const FLAG = path.join(os.homedir(), '.logica-active');

// Lees stdin (Claude Code stuurt prompt als JSON naar stdin)
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

  // Activeer commando's
  const activateFull  = /^\/(logica|logica\s+full)$/.test(prompt) || prompt.includes('logica modus') || prompt.includes('minder tokens') || prompt.includes('comprimeer');
  const activateLite  = /^\/logica\s+lite$/.test(prompt);
  const activateUltra = /^\/logica\s+ultra$/.test(prompt);
  const deactivate    = /^\/logica\s+off$/.test(prompt) || prompt.includes('normaal mode') || prompt.includes('stop logica');
  const statsCmd      = /^\/logica\s+stats$/.test(prompt);
  const expandCmd     = /^\/logica\s+expand$/.test(prompt);

  if (deactivate) {
    try { fs.unlinkSync(FLAG); } catch {}
    process.stdout.write(JSON.stringify({ statusMessage: '⬜ logica: off' }));
  } else if (activateUltra) {
    fs.writeFileSync(FLAG, 'ultra');
    process.stdout.write(JSON.stringify({ statusMessage: '🪨 logica: ULTRA' }));
  } else if (activateLite) {
    fs.writeFileSync(FLAG, 'lite');
    process.stdout.write(JSON.stringify({ statusMessage: '🔵 logica: LITE' }));
  } else if (activateFull) {
    fs.writeFileSync(FLAG, 'full');
    process.stdout.write(JSON.stringify({ statusMessage: '🟢 logica: FULL' }));
  } else if (statsCmd || expandCmd) {
    // Doorgeven aan Claude — geen mode-wijziging
    process.stdout.write(JSON.stringify({ statusMessage: '' }));
  } else {
    // Geen logica-commando — stil doorgaan
    process.stdout.write(JSON.stringify({ statusMessage: '' }));
  }

  process.exit(0);
});
