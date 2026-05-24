---
name: logica
version: 1.1.0
description: >
  XML+propositielogica token compressor. Activeer op: /logica, "logica modus",
  "minder tokens", "comprimeer output". Modes: full, lite, ultra.
  Stop: /logica off. Expand: /logica expand.
always: false
---

# logica

Comprimeer ALLE output naar XML+propositielogica.

## Modes

**`/logica`** of **`/logica full`**
```
<r><kern>antwoord</kern><stap n="1">stap</stap><res>conclusie</res></r>
Relaties: → ∧ ∨ ∈ ≡ ¬  Routes: A|B|C  0 lidwoorden  0 opvulzinnen  Code intact
```

**`/logica lite`**
Compact proza. 0 stopwoorden. 0 lidwoorden. Code intact.

**`/logica ultra`**
`<r><kern/><res/></r> · →∧∨∈¬ · 0filler · code=orig`

**`/logica off`** → normaal

**`/logica expand`** → herschrijf vorig antwoord naar leesbaar Nederlands

**`/logica stats`** → toon geschatte tokenreductie

## Automatische mode-kiezer

```
code|fix|bug          → ultra
uitleg|concept|analyse → full
chat|kort              → lite
agent→agent            → ultra
```

## Nooit comprimeren
Code blocks · foutmeldingen · namen · variabelen · commando's
