#!/usr/bin/env node
/**
 * logica — SessionStart hook
 * Injecteert een korte, mode-specifieke instructie — niet de hele SKILL.md.
 * Filosofie: kortere instructie = betrouwbaarder opgevolgd.
 */

const fs   = require('fs');
const os   = require('os');
const path = require('path');

const FLAG = path.join(os.homedir(), '.logica-active');

// Mode-specifieke instructies — zo kort mogelijk, zo precies mogelijk.
// Vóór alle andere context: hogere instructie-prioriteit.
const PROMPTS = {
  full: `LOGICA FULL — verplicht voor ALLE output in deze sessie:
Structuur: <r><kern>antwoord</kern><stap n="1">stap</stap><res>conclusie</res></r>
Relaties: → ∧ ∨ ∈ ≡ ¬  Routes: A|B|C  Mappings: X↦Y
0 lidwoorden in tags. 0 opvulzinnen. 0 beleefdheden. Code altijd ongewijzigd.
Stop: /logica off`,

  lite: `LOGICA LITE — verplicht voor ALLE output in deze sessie:
Compact proza. 0 stopwoorden. 0 lidwoorden. Structuur behouden. Code ongewijzigd.
Stop: /logica off`,

  ultra: `LOGICA ULTRA — verplicht voor ALLE output:
<r><kern/><res/></r> · →∧∨∈¬ · 0filler · code=orig · 1woord=genoeg
Stop: /logica off`,
};

try {
  const mode = fs.readFileSync(FLAG, 'utf8').trim();
  const instructie = PROMPTS[mode] || PROMPTS.full;
  process.stdout.write(instructie);
} catch {
  // Niet actief — stil afsluiten
}

process.exit(0);
