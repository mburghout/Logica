# 🔵 logica

**why use many token when few token do trick — maar dan met wiskunde**

XML + propositielogica compressor. ~75% tokenreductie. Volledig LLM-begrip. Alle agents.

---

## Voor/Na

| | |
|---|---|
| 🗣️ Normaal (68 tokens) | "De reden dat je React component opnieuw rendert is waarschijnlijk omdat je een nieuw object aanmaakt bij elke render-cyclus. Wanneer je een inline object als prop doorgeeft, ziet React's shallow comparison het als een ander object elke keer, wat een re-render triggert. Ik raad aan useMemo te gebruiken." |
| 🔵 Logica (18 tokens) | `<r><kern>new obj ref∀render</kern><oorzaak>inline prop↦new ref↦re-render</oorzaak><fix>wrap∈useMemo</fix></r>` |

**Zelfde fix. 75% minder. Claude begrijpt het perfect.**

---

## Installatie

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/mburghout/logica/main/install.sh | bash

# Of via npx
npx @mburghout/logica

# Specifieke agent
bash install.sh --only claude-code
bash install.sh --only cursor
bash install.sh --only mikeos
```

Vereist: Node ≥18. ~10 seconden. Veilig opnieuw uitvoeren.

---

## Gebruik

| Commando | Effect |
|---|---|
| `/logica` | Activeer (full mode) |
| `/logica lite` | Compact maar leesbaar |
| `/logica ultra` | Maximale compressie |
| `/logica expand` | Expandeer vorig antwoord naar NL |
| `/logica stats` | Toon tokenreductie sessie |
| `/logica off` | Deactiveer |

---

## Wat compriméert wat

| Ding | Logica doet |
|---|---|
| Tekst/uitleg | 🔵 XML + symbolen |
| Code blocks | ✍️ Ongewijzigd (code is al compact) |
| Technische termen | 🧠 Exact behouden |
| Foutmeldingen | 📋 Exact geciteerd |
| Opvulzinnen | 💀 Weg |
| Lidwoorden in tags | 💀 Weg |
| Beleefdheden | 💀 Weg |

---

## Automatische mode-kiezer

```
Q∈{code,fix,bug}      → ULTRA
Q∈{uitleg,concept}    → FULL
Q∈{chat,kort}         → LITE
agent-naar-agent       → ULTRA
∀Q: expand_on_request → /logica expand
```

---

## Waarom XML + propositielogica en niet Chinees?

Claude's tokenizer (BPE) groepeert ASCII-tekens tot ~4 chars/token.
Elk Chinees karakter = ~1 token. Dus `<route>DEV=code</route>` (17 chars, ~4 tokens)
is compacter dan `路徑代碼` (4 chars, 4 tokens) — met meer informatie.

Propositielogica scoort het best: Claude kent het diep (wiskundige redenering = kern van training),
ASCII = tokenizer-efficiënt, én het is nog debugbaar als er iets mis gaat.

```
NL origineel:     ~70 tokens  (basis)
XML-compressed:   ~28 tokens  (-60%)
Propositielogica: ~24 tokens  (-66%)
Logica (combo):   ~18 tokens  (-75%)
```

---

## Ondersteunde agents

| Agent | Methode | Auto-detect |
|---|---|---|
| Claude Code | Hooks + skill | ✓ |
| Cursor | Rule file | ✓ |
| Windsurf | Rule file | ✓ |
| Gemini CLI | Extensie | ✓ |
| Cline | Rule file | ✓ |
| MikeOS | Memory.md + ADA skill | ✓ |
| Overige | npx skills | handmatig |

---

## Verwijderen

```bash
bash install.sh --uninstall
# of
npx @mburghout/logica --uninstall
```

---

## Licentie

MIT — compress vrij als wilde mammoth op vlakte.
