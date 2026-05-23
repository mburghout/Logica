#!/usr/bin/env bash
# ============================================================
# logica — install.sh
# Token-compressor via XML + propositielogica
# Werkt met: Claude Code, Gemini CLI, Cursor, Windsurf, Cline,
#            Codex, OpenCode, Ollama (via MikeOS), en meer
#
# Gebruik:
#   curl -fsSL https://raw.githubusercontent.com/mburghout/logica/main/install.sh | bash
#   of lokaal: bash install.sh [opties]
#
# Opties:
#   --only <agent>   Installeer alleen voor specifieke agent
#   --dry-run        Toon wat er zou gebeuren zonder te installeren
#   --uninstall      Verwijder alle logica-installaties
#   --mode <mode>    Standaard mode instellen (full|lite|ultra)
# ============================================================

set -euo pipefail

# --- Kleuren ---
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

ok()   { echo -e "${GREEN}✓${RESET} $1"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $1"; }
info() { echo -e "${BLUE}→${RESET} $1"; }
fail() { echo -e "${RED}✗${RESET} $1"; }
head() { echo -e "\n${BOLD}$1${RESET}"; }

# --- Argumenten ---
ONLY=""
DRY_RUN=false
UNINSTALL=false
DEFAULT_MODE="full"

while [[ $# -gt 0 ]]; do
  case $1 in
    --only)     ONLY="$2"; shift 2 ;;
    --dry-run)  DRY_RUN=true; shift ;;
    --uninstall) UNINSTALL=true; shift ;;
    --mode)     DEFAULT_MODE="$2"; shift 2 ;;
    *)          shift ;;
  esac
done

# --- Paden ---
HOME_DIR="$HOME"
LOGICA_DIR="$HOME_DIR/.logica"
SKILL_DIR="$LOGICA_DIR/skills/logica"
HOOKS_DIR="$LOGICA_DIR/hooks"
FLAG_FILE="$HOME_DIR/.logica-active"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-./install.sh}")" && pwd)"

# --- Helpers ---
run() {
  if $DRY_RUN; then
    echo -e "  ${YELLOW}[dry-run]${RESET} $*"
  else
    "$@"
  fi
}

should_install() {
  [[ -z "$ONLY" ]] || [[ "$ONLY" == "$1" ]]
}

# ============================================================
# UNINSTALL
# ============================================================
if $UNINSTALL; then
  head "🧹 Logica verwijderen..."

  # Claude Code hooks verwijderen
  CLAUDE_CFG="${CLAUDE_CONFIG_DIR:-$HOME_DIR/.claude}"
  SETTINGS="$CLAUDE_CFG/settings.json"
  if [[ -f "$SETTINGS" ]]; then
    # Verwijder logica-entries uit settings.json
    if command -v node &>/dev/null; then
      run node -e "
        const fs=require('fs');
        const s=JSON.parse(fs.readFileSync('$SETTINGS','utf8'));
        if(s.hooks){
          for(const k of Object.keys(s.hooks)){
            s.hooks[k]=(s.hooks[k]||[]).filter(h=>!JSON.stringify(h).includes('logica'));
            if(!s.hooks[k].length) delete s.hooks[k];
          }
        }
        fs.writeFileSync('$SETTINGS',JSON.stringify(s,null,2));
      "
      ok "Claude Code hooks verwijderd"
    fi
  fi

  # Hook bestanden
  run rm -f "$HOOKS_DIR/logica-activate.js" "$HOOKS_DIR/logica-mode-tracker.js"

  # Flag file
  run rm -f "$FLAG_FILE"

  # Cursor/Windsurf rule files
  for rules_dir in ".cursor/rules" ".windsurf/rules" ".clinerules"; do
    if [[ -f "$HOME_DIR/$rules_dir/logica.md" ]]; then
      run rm -f "$HOME_DIR/$rules_dir/logica.md"
      ok "Verwijderd: ~/$rules_dir/logica.md"
    fi
  done

  # Gemini CLI
  GEMINI_EXT="$HOME_DIR/.gemini/extensions/logica"
  if [[ -d "$GEMINI_EXT" ]]; then
    run rm -rf "$GEMINI_EXT"
    ok "Gemini CLI extensie verwijderd"
  fi

  ok "Logica verwijderd."
  exit 0
fi

# ============================================================
# INSTALLATIE
# ============================================================
head "🔵 Logica installeren — XML+propositielogica compressor"
echo "   ~75% tokenreductie | Claude begrijpt het perfect | alle agents"
echo ""

# Vereisten checken
if ! command -v node &>/dev/null; then
  fail "Node.js ≥18 vereist. Installeer via: brew install node"
  exit 1
fi

NODE_VER=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
if [[ "$NODE_VER" -lt 18 ]]; then
  fail "Node.js ≥18 vereist. Huidige versie: $NODE_VER"
  exit 1
fi
ok "Node.js $NODE_VER gevonden"

# --- Centrale logica-dir aanmaken ---
run mkdir -p "$SKILL_DIR" "$HOOKS_DIR"

# SKILL.md kopiëren (of downloaden als lokaal niet beschikbaar)
if [[ -f "$SCRIPT_DIR/skills/logica/SKILL.md" ]]; then
  run cp "$SCRIPT_DIR/skills/logica/SKILL.md" "$SKILL_DIR/SKILL.md"
elif [[ -f "$SCRIPT_DIR/SKILL.md" ]]; then
  run cp "$SCRIPT_DIR/SKILL.md" "$SKILL_DIR/SKILL.md"
fi

# Hook bestanden kopiëren
for hook in logica-activate.js logica-mode-tracker.js; do
  if [[ -f "$SCRIPT_DIR/hooks/$hook" ]]; then
    run cp "$SCRIPT_DIR/hooks/$hook" "$HOOKS_DIR/$hook"
    run chmod +x "$HOOKS_DIR/$hook"
  fi
done

ok "Logica core geïnstalleerd in $LOGICA_DIR"

# ============================================================
# AGENT DETECTIE & INSTALLATIE
# ============================================================

INSTALLED_AGENTS=()

# --- CLAUDE CODE ---
install_claude_code() {
  local cfg="${CLAUDE_CONFIG_DIR:-$HOME_DIR/.claude}"
  local settings="$cfg/settings.json"
  local skills_dir="$cfg/skills"

  if ! command -v claude &>/dev/null && [[ ! -d "$cfg" ]]; then
    return 1
  fi

  info "Claude Code gevonden"
  run mkdir -p "$skills_dir/logica" "$cfg/hooks"

  # Skill installeren
  if [[ -f "$SKILL_DIR/SKILL.md" ]]; then
    run cp "$SKILL_DIR/SKILL.md" "$skills_dir/logica/SKILL.md"
  fi

  # Hook bestanden
  run cp "$HOOKS_DIR/logica-activate.js" "$cfg/hooks/" 2>/dev/null || true
  run cp "$HOOKS_DIR/logica-mode-tracker.js" "$cfg/hooks/" 2>/dev/null || true

  # Hooks registreren in settings.json
  if command -v node &>/dev/null; then
    run node -e "
      const fs=require('fs'),path=require('path');
      const f='$settings';
      let s={};
      try{ s=JSON.parse(fs.readFileSync(f,'utf8')); }catch{}
      if(!s.hooks) s.hooks={};

      const hooksDir='$cfg/hooks';

      // SessionStart: injecteer logica-context
      if(!s.hooks.SessionStart) s.hooks.SessionStart=[];
      const hasActivate=s.hooks.SessionStart.some(h=>JSON.stringify(h).includes('logica-activate'));
      if(!hasActivate) s.hooks.SessionStart.push({
        type:'command',
        command:'node '+path.join(hooksDir,'logica-activate.js'),
        timeout:5
      });

      // UserPromptSubmit: track /logica commando's
      if(!s.hooks.UserPromptSubmit) s.hooks.UserPromptSubmit=[];
      const hasTracker=s.hooks.UserPromptSubmit.some(h=>JSON.stringify(h).includes('logica-mode-tracker'));
      if(!hasTracker) s.hooks.UserPromptSubmit.push({
        type:'command',
        command:'node '+path.join(hooksDir,'logica-mode-tracker.js'),
        timeout:5
      });

      fs.mkdirSync(path.dirname(f),{recursive:true});
      fs.writeFileSync(f,JSON.stringify(s,null,2));
    "
    ok "Claude Code hooks geregistreerd"
  fi

  INSTALLED_AGENTS+=("claude-code")
  ok "Claude Code ✓"
}

# --- GEMINI CLI ---
install_gemini() {
  if ! command -v gemini &>/dev/null && [[ ! -d "$HOME_DIR/.gemini" ]]; then
    return 1
  fi

  info "Gemini CLI gevonden"
  local ext_dir="$HOME_DIR/.gemini/extensions/logica"
  run mkdir -p "$ext_dir"

  cat > /tmp/logica-gemini.md << 'GEMINI_SKILL'
# logica — token compressor

Wanneer de gebruiker /logica zegt of "logica modus": comprimeer ALLE output.
Gebruik XML-structuur + propositielogica symbolen (→ ∧ ∨ ∈ ¬ ∀ ∃ ↦ ≡).
0 lidwoorden in tags. 0 opvulzinnen. 0 beleefdheden.
Code blocks altijd ongewijzigd. Technische termen exact behouden.
Stop: /logica off
GEMINI_SKILL

  run cp /tmp/logica-gemini.md "$ext_dir/SKILL.md"
  INSTALLED_AGENTS+=("gemini-cli")
  ok "Gemini CLI ✓"
}

# --- CURSOR ---
install_cursor() {
  if [[ ! -d "$HOME_DIR/.cursor" ]] && ! command -v cursor &>/dev/null; then
    return 1
  fi

  info "Cursor gevonden"
  run mkdir -p "$HOME_DIR/.cursor/rules"

  cat > /tmp/logica-cursor.md << 'CURSOR_RULE'
---
alwaysApply: false
description: "Activeer logica-compressor: /logica, logica modus, minder tokens"
globs: []
---

# logica compressor

Op /logica of "logica modus": comprimeer output naar XML+propositielogica.
`<r><kern>...</kern><stap n="1">...</stap></r>`
Symbolen: → ∧ ∨ ∈ ¬ ∀ ∃ ↦
0 lidwoorden. 0 opvulzinnen. Code intact.
Stop: /logica off
CURSOR_RULE

  run cp /tmp/logica-cursor.md "$HOME_DIR/.cursor/rules/logica.md"
  INSTALLED_AGENTS+=("cursor")
  ok "Cursor ✓"
}

# --- WINDSURF ---
install_windsurf() {
  if [[ ! -d "$HOME_DIR/.windsurf" ]] && [[ ! -d "$HOME_DIR/.codeium" ]]; then
    return 1
  fi

  info "Windsurf gevonden"
  run mkdir -p "$HOME_DIR/.windsurf/rules"
  run cp /tmp/logica-cursor.md "$HOME_DIR/.windsurf/rules/logica.md" 2>/dev/null || \
    run cp /tmp/logica-cursor.md "$HOME_DIR/.windsurf/rules/logica.md"
  INSTALLED_AGENTS+=("windsurf")
  ok "Windsurf ✓"
}

# --- CLINE ---
install_cline() {
  if [[ ! -d "$HOME_DIR/.cline" ]] && [[ ! -f "$HOME_DIR/.clinerules" ]]; then
    return 1
  fi

  info "Cline gevonden"
  run mkdir -p "$HOME_DIR/.clinerules"
  [[ -f /tmp/logica-cursor.md ]] || return 1
  run cp /tmp/logica-cursor.md "$HOME_DIR/.clinerules/logica.md"
  INSTALLED_AGENTS+=("cline")
  ok "Cline ✓"
}

# --- CODEX (OpenAI) ---
install_codex() {
  if ! command -v codex &>/dev/null; then
    return 1
  fi

  info "Codex gevonden"
  if command -v npx &>/dev/null; then
    run npx skills add --local "$LOGICA_DIR/skills/logica" 2>/dev/null || true
    INSTALLED_AGENTS+=("codex")
    ok "Codex ✓"
  fi
}

# --- MIKEOS (lokale Ollama-omgeving) ---
install_mikeos() {
  local mikeos_dir="$HOME_DIR/Mike app/_zakelijk/mikeos"
  local backend="$HOME_DIR/Mike app/_zakelijk/privacyapp/backend"

  if [[ ! -d "$mikeos_dir" ]] && [[ ! -d "$backend" ]]; then
    return 1
  fi

  info "MikeOS gevonden"

  # Schrijf logica-mode naar memory.md als hint voor ADA
  if [[ -f "$mikeos_dir/memory.md" ]]; then
    if ! grep -q "logica-compressor" "$mikeos_dir/memory.md" 2>/dev/null; then
      run bash -c "echo '' >> '$mikeos_dir/memory.md' && echo '## logica-compressor' >> '$mikeos_dir/memory.md' && echo 'Actief. Comprimeer interne agent-output naar XML+propositielogica. Alleen expanderen op verzoek.' >> '$mikeos_dir/memory.md'"
      ok "MikeOS memory.md bijgewerkt"
    fi
  fi

  # Kopieer skill naar ADA-context
  local ada_skills="$HOME_DIR/Mike app/_zakelijk/Claude"
  if [[ -d "$ada_skills" ]]; then
    run mkdir -p "$ada_skills/skills"
    run cp "$SKILL_DIR/SKILL.md" "$ada_skills/skills/logica.md" 2>/dev/null || true
    ok "ADA skill context bijgewerkt"
  fi

  INSTALLED_AGENTS+=("mikeos")
  ok "MikeOS ✓"
}

# --- npx skills (universele fallback) ---
install_npx_skills() {
  if ! command -v npx &>/dev/null; then
    return 1
  fi

  # Alleen als fallback als andere agents al geïnstalleerd zijn
  if [[ ${#INSTALLED_AGENTS[@]} -gt 0 ]]; then
    return 0
  fi

  info "npx skills (universele installatie)"
  if [[ -d "$LOGICA_DIR/skills/logica" ]]; then
    run npx skills add --local "$LOGICA_DIR/skills/logica" 2>/dev/null && \
      INSTALLED_AGENTS+=("npx-skills") && ok "npx skills ✓" || \
      warn "npx skills: niet beschikbaar"
  fi
}

# ============================================================
# INSTALLEER PER AGENT
# ============================================================

if [[ -z "$ONLY" ]] || [[ "$ONLY" == "claude-code" ]]; then
  install_claude_code 2>/dev/null || true
fi

if [[ -z "$ONLY" ]] || [[ "$ONLY" == "gemini" ]]; then
  install_gemini 2>/dev/null || true
fi

if [[ -z "$ONLY" ]] || [[ "$ONLY" == "cursor" ]]; then
  install_cursor 2>/dev/null || true
fi

if [[ -z "$ONLY" ]] || [[ "$ONLY" == "windsurf" ]]; then
  install_windsurf 2>/dev/null || true
fi

if [[ -z "$ONLY" ]] || [[ "$ONLY" == "cline" ]]; then
  install_cline 2>/dev/null || true
fi

if [[ -z "$ONLY" ]] || [[ "$ONLY" == "codex" ]]; then
  install_codex 2>/dev/null || true
fi

if [[ -z "$ONLY" ]] || [[ "$ONLY" == "mikeos" ]]; then
  install_mikeos 2>/dev/null || true
fi

install_npx_skills 2>/dev/null || true

# ============================================================
# STANDAARD MODE INSTELLEN
# ============================================================
if [[ "$DEFAULT_MODE" != "off" ]]; then
  if $DRY_RUN; then
    info "[dry-run] Schrijf '$DEFAULT_MODE' naar $FLAG_FILE"
  else
    echo "$DEFAULT_MODE" > "$FLAG_FILE"
    ok "Standaard mode: $DEFAULT_MODE"
  fi
fi

# ============================================================
# SAMENVATTING
# ============================================================
head "✅ Klaar"
echo ""

if [[ ${#INSTALLED_AGENTS[@]} -eq 0 ]]; then
  warn "Geen agents automatisch gedetecteerd."
  echo ""
  echo "  Handmatig installeren voor specifieke agent:"
  echo "  bash install.sh --only claude-code"
  echo "  bash install.sh --only cursor"
  echo "  bash install.sh --only gemini"
  echo "  bash install.sh --only mikeos"
else
  echo "  Geïnstalleerd voor: ${INSTALLED_AGENTS[*]}"
fi

echo ""
echo "  Gebruik:"
echo "    /logica          → activeer (full mode)"
echo "    /logica lite     → compact maar leesbaar"
echo "    /logica ultra    → maximale compressie"
echo "    /logica expand   → expandeer vorig antwoord naar NL"
echo "    /logica stats    → toon tokenreductie"
echo "    /logica off      → deactiveer"
echo ""
echo "  Verwijderen: bash install.sh --uninstall"
echo ""
