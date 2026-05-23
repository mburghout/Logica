#!/usr/bin/env node
/**
 * logica — SessionStart hook
 * Als ~/.logica-active bestaat: injecteer compressor-instructie als hidden system context.
 * Claude ziet het, gebruiker niet.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const FLAG = path.join(os.homedir(), '.logica-active');
const SKILL = path.join(os.homedir(), '.logica', 'skills', 'logica', 'SKILL.md');

function getMode() {
  try {
    const content = fs.readFileSync(FLAG, 'utf8').trim();
    return content || 'full';
  } catch {
    return null;
  }
}

function getSkillContent() {
  try {
    return fs.readFileSync(SKILL, 'utf8');
  } catch {
    // Fallback inline als SKILL.md niet gevonden
    return null;
  }
}

const mode = getMode();

if (mode) {
  const skill = getSkillContent();
  const modeUpper = mode.toUpperCase();

  if (skill) {
    process.stdout.write(skill);
  } else {
    // Inline fallback — minimale versie
    process.stdout.write(`<logica-mode>${modeUpper}</logica-mode>
Comprimeer ALLE output: XML-structuur + propositielogica symbolen (→∧∨∈¬∀∃).
0 lidwoorden in tags. 0 opvulzinnen. Code blocks ongewijzigd.
Mode ${modeUpper}: ${mode === 'ultra' ? 'maximale compressie' : mode === 'lite' ? 'compact maar leesbaar' : 'standaard XML+logica'}.
Stop: /logica off`);
  }

  process.exit(0);
} else {
  // Niet actief — stil afsluiten
  process.exit(0);
}
