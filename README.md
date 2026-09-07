# Automatizare marketing multi-canal pentru agenții de turism

n8n + GoHighLevel + Claude API. Construit ca **produs alb, parametrizabil**: aceleași workflow-uri
servesc mai mulți clienți, un client nou se adaugă completând un fișier de config.

Client pilot: Dor Travel — „Destinația Ta Perfectă".

## Stare

| Fază | Conținut | Stare |
|---|---|---|
| **0 — Fundație** | config multi-client, schema GHL + provisioning, wrapper GHL API v2, garda de trimitere, formular preferințe | ✅ livrat, verificat |
| **1 — MVP tranzacțional** | fluxurile 1, 3, 4, 7, 8, 9, 10, 11 | ⏳ urmează |
| **2 — Comercial + conținut** | fluxurile 2, 5, 6, 16, oferte personalizate, generare via Claude API | ⏳ |
| **3 — Retenție + raportare** | fluxurile 12–15, dashboard KPI | ⏳ |

Ce blochează pornirea efectivă: `docs/02-intrebari-deschise.md`.

## Repere

```
config/clients/<id>.json    tot ce e specific unui client — singurul loc
config/schema/              schema care validează configurile
n8n/runtime/*.mjs           logica de decizie, testată; se inlinează în node-urile Code
n8n/workflows/*.json        workflow-uri generate, client-agnostice, fără credențiale
scripts/                    validare, provisioning, generare workflow-uri/docs/formular
docs/                       arhitectură, schema GHL, întrebări, onboarding, testare, KPI
forms/<id>.html             formularul de preferințe, generat din taxonomia clientului
```

## Comenzi

```bash
npm run validate -- dor-travel        # validează configul unui client
npm test                              # logica de runtime (garda, randarea, maparea)
npm run build:n8n                     # generează workflow-urile
npm run check:n8n                     # structură + secrete + literale de client
npm run check                         # toate cele de mai sus

npm run docs -- dor-travel            # regenerează docs/01 din config
npm run form -- dor-travel            # regenerează formularul de preferințe

GHL_PIT=… GHL_LOCATION_ID_DOR_TRAVEL=… npm run provision -- dor-travel            # dry-run
GHL_PIT=… GHL_LOCATION_ID_DOR_TRAVEL=… npm run provision -- dor-travel -- --apply # scrie în GHL
```

Zero dependințe npm, intenționat: totul rulează pe Node ≥ 18 fără `npm install`, inclusiv pe un
runner curat la onboarding-ul unui client nou.

## Principii care nu se negociază

- **Nicio comunicare identică către toată baza.** Fiecare mesaj e segmentat pe profilul contactului.
- **Fără consimțământ pe canal, nu se trimite** — indiferent de flux.
- **Claude nu scrie cifre.** Prețuri, procente, disponibilități, date și nume de hoteluri vin
  exclusiv din merge fields sau din text scris de om. Regula e verificată automat.
- **Un email cu „Bună, {{prenume}}" gol nu pleacă niciodată.**
- **Un client nou nu cere editarea niciunui node n8n.** Verificat de `npm run check:n8n`.

## Pornirea unui client nou

`docs/04-onboarding-client-nou.md` — checklist executabil, de la sub-cont GHL până la go-live.
