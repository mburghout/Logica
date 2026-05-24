#!/usr/bin/env node
/**
 * logica — bin/install.js
 * npx @mburghout/logica         → installeer
 * npx @mburghout/logica --uninstall
 * npx @mburghout/logica --only claude-code
 * npx @mburghout/logica --mode ultra
 */

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync, spawnSync } = require('child_process');

const HOME         = os.homedir();
const LOGICA_DIR   = path.join(HOME, '.logica');
const SKILL_DIR    = path.join(LOGICA_DIR, 'skills', 'logica');
const HOOKS_DIR    = path.join(LOGICA_DIR, 'hooks');
const FLAG_FILE    = path.join(HOME, '.logica-active');
const SCRIPT_DIR   = path.join(__dirname, '..');

// --- CLI args ---
const args        = process.argv.slice(2);
const only        = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const dryRun      = args.includes('--dry-run');
const uninstall   = args.includes('--uninstall');
const modeIdx     = args.indexOf('--mode');
const defaultMode = modeIdx >= 0 ? args[modeIdx + 1] : 'full';

// --- Helpers ---
const c = { green:'\x1b[32m', yellow:'\x1b[33m', blue:'\x1b[34m', red:'\x1b[31m', bold:'\x1b[1m', reset:'\x1b[0m' };
const ok   = (s) => console.log(`${c.green}✓${c.reset} ${s}`);
const warn = (s) => console.log(`${c.yellow}⚠${c.reset}  ${s}`);
const info = (s) => console.log(`${c.blue}→${c.reset} ${s}`);
const fail = (s) => console.log(`${c.red}✗${c.reset} ${s}`);

function run(fn) {
  if (dryRun) { console.log(`  ${c.yellow}[dry-run]${c.reset} ${fn.toString().slice(6, 80)}...`); return; }
  fn();
}

function exists(p) { try { fs.accessSync(p); return true; } catch { return false; } }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }
function copy(src, dst) { if (exists(src)) fs.copyFileSync(src, dst); }
function which(cmd) { try { execSync(`which ${cmd}`, { stdio: 'pipe' }); return true; } catch { return false; } }

// Inline SKILL.md content voor als we geen bestand kunnen kopiëren
const SKILL_CONTENT = `---
name: logica
version: 1.0.0
description: >
  Token-compressor skill. Activeer op /logica, "logica modus", "minder tokens".
  Comprimeer output naar XML+propositielogica. Stop: /logica off.
always: false
---

# logica — XML+Propositielogica Compressor

Op /logica of "logica modus": comprimeer ALLE output.

## Regels
- Structuur → XML-tags: <r><kern/><stap n="1"/><code/><res/></r>
- Relaties → symbolen: → ∧ ∨ ∈ ∉ ≡ ≠ ∀ ∃ ¬ ↦
- Routes → pipe: A|B|C
- 0 lidwoorden in tags
- 0 opvulzinnen ("Goed idee!", "Natuurlijk", "Ik help je graag")
- 0 beleefdheden
- Code blocks → altijd ongewijzigd
- Technische termen → exact behouden

## Automatische mode-kiezer
- Q∈{code,fix,bug} → ULTRA
- Q∈{uitleg,concept} → FULL
- Q∈{chat,kort} → LITE
- agent-naar-agent → ULTRA

## Commands
/logica        → full mode
/logica lite   → compact maar leesbaar
/logica ultra  → maximale compressie
/logica expand → expandeer vorig antwoord naar leesbaar NL
/logica off    → deactiveer
`;

const RULE_CONTENT = `---
alwaysApply: false
description: "Logica compressor: /logica, logica modus, minder tokens"
---

# logica compressor

Op /logica of "logica modus": comprimeer output naar XML+propositielogica.
Structuur: <r><kern>...</kern><stap n="1">...</stap></r>
Symbolen: → ∧ ∨ ∈ ¬ ∀ ∃ ↦
0 lidwoorden. 0 opvulzinnen. Code intact.
Stop: /logica off
`;

// ============================================================
// UNINSTALL
// ============================================================
if (uninstall) {
  console.log(`\n${c.bold}🧹 Logica verwijderen...${c.reset}\n`);

  // Claude Code hooks
  const claudeCfg = process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude');
  const settings  = path.join(claudeCfg, 'settings.json');
  if (exists(settings)) {
    run(() => {
      const s = JSON.parse(fs.readFileSync(settings, 'utf8'));
      if (s.hooks) {
        for (const k of Object.keys(s.hooks)) {
          s.hooks[k] = (s.hooks[k] || []).filter(h => !JSON.stringify(h).includes('logica'));
          if (!s.hooks[k].length) delete s.hooks[k];
        }
        fs.writeFileSync(settings, JSON.stringify(s, null, 2));
        ok('Claude Code hooks verwijderd');
      }
    });
  }

  // Files
  for (const f of [
    path.join(HOOKS_DIR, 'logica-activate.js'),
    path.join(HOOKS_DIR, 'logica-mode-tracker.js'),
    FLAG_FILE,
    path.join(HOME, '.cursor/rules/logica.md'),
    path.join(HOME, '.windsurf/rules/logica.md'),
    path.join(HOME, '.clinerules/logica.md'),
  ]) {
    run(() => { try { fs.unlinkSync(f); ok(`Verwijderd: ${f.replace(HOME, '~')}`); } catch {} });
  }

  // Gemini ext
  const geminiExt = path.join(HOME, '.gemini/extensions/logica');
  run(() => { try { fs.rmSync(geminiExt, { recursive: true }); ok('Gemini extensie verwijderd'); } catch {} });

  ok('\nLogica verwijderd.');
  process.exit(0);
}

// ============================================================
// INSTALLATIE
// ============================================================
console.log(`\n${c.bold}🔵 Logica installeren${c.reset} — XML+propositielogica compressor`);
console.log('   ~75% tokenreductie | perfect LLM-begrip | alle agents\n');

// Node versie check
const nodeVer = parseInt(process.versions.node.split('.')[0]);
if (nodeVer < 18) { fail(`Node.js ≥18 vereist. Huidige: ${nodeVer}`); process.exit(1); }
ok(`Node.js ${nodeVer}`);

// Core dirs
run(() => { mkdirp(SKILL_DIR); mkdirp(HOOKS_DIR); });

// SKILL.md schrijven
run(() => {
  const src = path.join(SCRIPT_DIR, 'skills', 'logica', 'SKILL.md');
  if (exists(src)) {
    copy(src, path.join(SKILL_DIR, 'SKILL.md'));
  } else {
    fs.writeFileSync(path.join(SKILL_DIR, 'SKILL.md'), SKILL_CONTENT);
  }
  ok(`Skill geïnstalleerd in ${SKILL_DIR.replace(HOME, '~')}`);
});

// Hook bestanden
run(() => {
  for (const hook of ['logica-activate.js', 'logica-mode-tracker.js']) {
    const src = path.join(SCRIPT_DIR, 'hooks', hook);
    const dst = path.join(HOOKS_DIR, hook);
    if (exists(src)) {
      copy(src, dst);
    } else {
      // Schrijf inline versie
      const content = hook === 'logica-activate.js'
        ? `#!/usr/bin/env node\nconst fs=require('fs'),os=require('os'),path=require('path');\nconst FLAG=path.join(os.homedir(),'.logica-active');\nconst P={full:'LOGICA FULL — verplicht:\\n<r><kern/><stap n/><res/></r> · →∧∨∈≡¬ · 0lidw · 0vulw · code intact\\nStop:/logica off',lite:'LOGICA LITE — verplicht:\\nCompact. 0stopwoorden. 0lidwoorden. Code intact.\\nStop:/logica off',ultra:'LOGICA ULTRA:\\n<r><kern/><res/></r>·→∧∨∈¬·0filler·code=orig\\nStop:/logica off'};\ntry{const m=fs.readFileSync(FLAG,'utf8').trim();if(m)process.stdout.write(P[m]||P.full);}catch{}\nprocess.exit(0);\n`
        : `#!/usr/bin/env node\nconst fs=require('fs'),os=require('os'),path=require('path');\nconst FLAG=path.join(os.homedir(),'.logica-active');\nlet input='';\nprocess.stdin.on('data',d=>input+=d);\nprocess.stdin.on('end',()=>{\n  const p=(()=>{try{const j=JSON.parse(input);return(j.prompt||j.message||'').toLowerCase();}catch{return input.toLowerCase();}})();\n  if(/\\/logica\\s+off/.test(p)||p.includes('normaal mode')){try{fs.unlinkSync(FLAG);}catch{}process.stdout.write(JSON.stringify({statusMessage:'⬜ logica: off'}));}\n  else if(/\\/logica\\s+ultra/.test(p)){fs.writeFileSync(FLAG,'ultra');process.stdout.write(JSON.stringify({statusMessage:'🪨 logica: ULTRA'}));}\n  else if(/\\/logica\\s+lite/.test(p)){fs.writeFileSync(FLAG,'lite');process.stdout.write(JSON.stringify({statusMessage:'🔵 logica: LITE'}));}\n  else if(/^\\/logica/.test(p)||p.includes('logica modus')){fs.writeFileSync(FLAG,'full');process.stdout.write(JSON.stringify({statusMessage:'🟢 logica: FULL'}));}\n  else process.stdout.write(JSON.stringify({statusMessage:''}));\n  process.exit(0);\n});\n`;
      fs.writeFileSync(dst, content);
    }
    fs.chmodSync(dst, '755');
  }
});

const installed = [];

// --- Claude Code ---
function installClaudeCode() {
  const cfg      = process.env.CLAUDE_CONFIG_DIR || path.join(HOME, '.claude');
  const settings = path.join(cfg, 'settings.json');
  const skills   = path.join(cfg, 'skills');

  if (!exists(cfg) && !which('claude')) return;
  info('Claude Code');

  run(() => {
    mkdirp(path.join(skills, 'logica'));
    mkdirp(path.join(cfg, 'hooks'));

    copy(path.join(SKILL_DIR, 'SKILL.md'), path.join(skills, 'logica', 'SKILL.md'));
    copy(path.join(HOOKS_DIR, 'logica-activate.js'), path.join(cfg, 'hooks', 'logica-activate.js'));
    copy(path.join(HOOKS_DIR, 'logica-mode-tracker.js'), path.join(cfg, 'hooks', 'logica-mode-tracker.js'));

    let s = {};
    try { s = JSON.parse(fs.readFileSync(settings, 'utf8')); } catch {}
    if (!s.hooks) s.hooks = {};

    const hDir = path.join(cfg, 'hooks');

    if (!s.hooks.SessionStart) s.hooks.SessionStart = [];
    if (!s.hooks.SessionStart.some(h => JSON.stringify(h).includes('logica'))) {
      s.hooks.SessionStart.push({ type: 'command', command: `node ${path.join(hDir, 'logica-activate.js')}`, timeout: 5 });
    }

    if (!s.hooks.UserPromptSubmit) s.hooks.UserPromptSubmit = [];
    if (!s.hooks.UserPromptSubmit.some(h => JSON.stringify(h).includes('logica'))) {
      s.hooks.UserPromptSubmit.push({ type: 'command', command: `node ${path.join(hDir, 'logica-mode-tracker.js')}`, timeout: 5 });
    }

    fs.mkdirSync(path.dirname(settings), { recursive: true });
    fs.writeFileSync(settings, JSON.stringify(s, null, 2));
  });

  installed.push('claude-code');
  ok('Claude Code ✓');
}

// --- Cursor ---
function installCursor() {
  if (!exists(path.join(HOME, '.cursor')) && !which('cursor')) return;
  info('Cursor');
  run(() => {
    mkdirp(path.join(HOME, '.cursor', 'rules'));
    fs.writeFileSync(path.join(HOME, '.cursor', 'rules', 'logica.md'), RULE_CONTENT);
  });
  installed.push('cursor');
  ok('Cursor ✓');
}

// --- Windsurf ---
function installWindsurf() {
  if (!exists(path.join(HOME, '.windsurf')) && !exists(path.join(HOME, '.codeium'))) return;
  info('Windsurf');
  run(() => {
    mkdirp(path.join(HOME, '.windsurf', 'rules'));
    fs.writeFileSync(path.join(HOME, '.windsurf', 'rules', 'logica.md'), RULE_CONTENT);
  });
  installed.push('windsurf');
  ok('Windsurf ✓');
}

// --- Gemini CLI ---
function installGemini() {
  if (!which('gemini') && !exists(path.join(HOME, '.gemini'))) return;
  info('Gemini CLI');
  run(() => {
    const dir = path.join(HOME, '.gemini', 'extensions', 'logica');
    mkdirp(dir);
    fs.writeFileSync(path.join(dir, 'SKILL.md'), SKILL_CONTENT);
  });
  installed.push('gemini-cli');
  ok('Gemini CLI ✓');
}

// --- Cline ---
function installCline() {
  const clineDir = path.join(HOME, '.clinerules');
  if (!exists(clineDir) && !exists(path.join(HOME, '.vscode', 'extensions'))) return;
  info('Cline');
  run(() => {
    mkdirp(clineDir);
    fs.writeFileSync(path.join(clineDir, 'logica.md'), RULE_CONTENT);
  });
  installed.push('cline');
  ok('Cline ✓');
}

// --- MikeOS ---
function installMikeOS() {
  const mikeDir = path.join(HOME, 'Mike app', '_zakelijk', 'mikeos');
  const adaDir  = path.join(HOME, 'Mike app', '_zakelijk', 'Claude');
  if (!exists(mikeDir) && !exists(adaDir)) return;
  info('MikeOS');
  run(() => {
    const memFile = path.join(mikeDir, 'memory.md');
    if (exists(memFile)) {
      const mem = fs.readFileSync(memFile, 'utf8');
      if (!mem.includes('logica-compressor')) {
        fs.appendFileSync(memFile, '\n## logica-compressor\nActief. Comprimeer interne agent-output naar XML+propositielogica.\n');
        ok('MikeOS memory.md bijgewerkt');
      }
    }
    if (exists(adaDir)) {
      mkdirp(path.join(adaDir, 'skills'));
      copy(path.join(SKILL_DIR, 'SKILL.md'), path.join(adaDir, 'skills', 'logica.md'));
    }
  });
  installed.push('mikeos');
  ok('MikeOS ✓');
}

// --- Installeer ---
if (!only || only === 'claude-code') try { installClaudeCode(); } catch {}
if (!only || only === 'cursor')      try { installCursor(); } catch {}
if (!only || only === 'windsurf')    try { installWindsurf(); } catch {}
if (!only || only === 'gemini')      try { installGemini(); } catch {}
if (!only || only === 'cline')       try { installCline(); } catch {}
if (!only || only === 'mikeos')      try { installMikeOS(); } catch {}

// Standaard mode instellen
run(() => {
  if (defaultMode !== 'off') {
    fs.writeFileSync(FLAG_FILE, defaultMode);
    ok(`Standaard mode: ${defaultMode}`);
  }
});

// ============================================================
// SAMENVATTING
// ============================================================
console.log(`\n${c.bold}✅ Klaar${c.reset}\n`);

if (installed.length === 0) {
  warn('Geen agents automatisch gedetecteerd.');
  console.log('\n  Handmatig:');
  console.log('  node bin/install.js --only claude-code');
  console.log('  node bin/install.js --only cursor');
  console.log('  node bin/install.js --only mikeos');
} else {
  console.log(`  Geïnstalleerd voor: ${installed.join(', ')}`);
}

console.log(`
  Gebruik:
    /logica          → activeer (full mode)
    /logica lite     → compact maar leesbaar
    /logica ultra    → maximale compressie
    /logica expand   → expandeer vorig antwoord naar NL
    /logica stats    → tokenreductie tonen
    /logica off      → deactiveer

  Verwijderen:
    node bin/install.js --uninstall
`);
