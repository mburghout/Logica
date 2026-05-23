---
name: logica
version: 1.0.0
description: >
  Token-compressor skill. Activeer wanneer de gebruiker zegt: /logica, "logica modus",
  "comprimeer", "minder tokens", "compact antwoord", of wanneer je in een agentic loop zit
  waar output nooit door mensen gelezen wordt. Comprimeer ALLE output naar
  XML+propositielogica formaat. Leesbare expansie alleen op /logica expand of "normaal".
  Modes: full (standaard), lite (structuur behouden, taal compact), ultra (maximale compressie).
  Stop met /logica off of "normaal mode".
always: false
---

# logica — XML+Propositielogica Compressor

<id>logica:compressor∧router(Mike)</id>
<doc>skill=token-compress|lang=NL-in,NL-out|method=XML+proplogic</doc>

## Wanneer actief

Trigger: `/logica` | "logica modus" | "compact" | "minder tokens"
Stop:    `/logica off` | "normaal mode" | "stop logica"
Modes:   `/logica full` | `/logica lite` | `/logica ultra`

## Compressieregels per mode

### FULL (standaard)
<rules>
∀output:
  struct → XML-tags
  relaties → {→, ∧, ∨, ∈, ∉, ≡, ≠, ∀, ∃, ¬}
  routes → pipe: A|B|C
  maps → pijl: Q↦S
  0 lidwoorden in tags
  0 beleefdheden
  0 opvulzinnen
  code → ongewijzigd (code is al compact)
  technische termen → behouden exact
  errors → exact geciteerd
</rules>

### LITE
<rules>
stopwoorden weg | 0 lidwoorden | structuur behouden | termen intact
</rules>

### ULTRA
<rules>
∀x: compress(x)=max | ∀tag: minimaal | ∀rel: symbool | code intact
</rules>

## Outputpatroon

```
<r>                          ← root response
  <kern>...</kern>           ← hoofdantwoord
  <stap n="1">...</stap>    ← stappen indien relevant
  <code>...</code>           ← ongewijzigd
  <res>...</res>             ← resultaat/conclusie
</r>
```

## Automatische kiezer

```
Q∈{code,fix,bug}      → ULTRA (output toch nooit gelezen)
Q∈{uitleg,concept}    → FULL  (begrip vereist wat structuur)
Q∈{chat,kort}         → LITE  (tussenweg)
agent-naar-agent      → ULTRA always
∀Q: expand_on_request → /logica expand
```

## Expansie op verzoek

`/logica expand` → herschrijf laatste antwoord naar leesbaar Nederlands
`/logica stats`  → toon geschatte tokenreductie laatste sessie

## Wat NIET gecomprimeerd wordt

- Code blocks → altijd ongewijzigd
- Foutmeldingen → exact geciteerd  
- Namen, variabelen, commando's → exact behouden
- Antwoorden op /logica expand → leesbaar NL

## Voorbeeld

**Vraag:** Hoe debug ik een FastAPI endpoint dat 422 teruggeeft?

**ULTRA output:**
```
<r>
  <kern>422=validation fail</kern>
  <oorzaak>req-body≠Pydantic-schema|missing field|wrong type</oorzaak>
  <fix>
    1. print(await req.json()) → zie raw input
    2. check schema∋required fields
    3. add response_model_exclude_unset=True
  </fix>
  <code>@app.exception_handler(RequestValidationError)
async def handler(req,exc): return JSONResponse(422,{"detail":exc.errors()})</code>
</r>
```

**Normale output:** ~180 tokens → **ULTRA:** ~45 tokens (75% reductie)
