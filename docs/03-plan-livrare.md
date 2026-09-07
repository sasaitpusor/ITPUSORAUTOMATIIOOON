# Plan de livrare și stare curentă

Ordinea din secțiunea 16 a brief-ului: nu se construiește tot deodată, fiecare fază se validează
înainte de următoarea.

## Faza 0 — Fundație ✅ livrată

| Livrabil | Unde | Stare |
|---|---|---|
| Config multi-client + schemă + documentația parametrilor | `config/` | ✅ |
| Schema completă de custom fields și tag-uri | `docs/01-*` (generat din config) | ✅ 42 câmpuri, 82 tag-uri |
| Provisioning GHL, idempotent | `scripts/provision-ghl.mjs` + `WF_SETUP_provisioning.json` | ✅ aceeași logică de plan, două rulări posibile |
| Wrapper reutilizabil GHL API v2 | `n8n/workflows/SW01_*`, `scripts/lib/ghl.mjs` | ✅ |
| Garda de trimitere (consimțământ, frecvență, ferestre, suprimare, idempotență) | `n8n/runtime/guard.mjs`, `SW02_*` | ✅ 20 teste |
| Randare merge fields cu fallback | `n8n/runtime/render.mjs` | ✅ 6 teste |
| Formular de preferințe + scriere înapoi în GHL | `forms/`, `WF00_*` | ✅ |
| Alertare la eșec | `WF_ERR_*` | ✅ |
| Verificare automată de reutilizabilitate | `scripts/check-n8n.mjs` | ✅ |

**Ce blochează validarea fazei 0:** accesul efectiv la API-ul GHL. Tokenul există, dar rețeaua din
care se rulează trebuie să ajungă la `services.leadconnectorhq.com`. De aceea provisioning-ul poate
rula și ca workflow n8n, nu doar ca script — n8n rulează în rețeaua clientului.

Rămâne de confirmat T0.4: forma exactă a `customFields` la update (`{key, field_value}` vs
`{id, value}`), singurul punct din sistem pe care testele nu-l pot determina singure.

## Faza 1 — MVP tranzacțional 🔜 următoarea

Fluxurile 1, 3, 4, 7, 8, 9, 10, 11 + actualizare preferințe. Liniare, fără segmentare complexă,
valoare vizibilă rapid.

Toate sunt deja **declarate în config** (`flows.*`: trigger, pași, offset-uri, canale). Ce mai e de
construit: workflow-urile generice care execută declarațiile — un runner pentru fluxuri declanșate de
tag, unul pentru scanări zilnice ancorate pe dată (`data_plecare`, `data_intoarcere`, `data_check_in`),
și crearea task-urilor către consultanți.

Dependințe: întrebările 2, 4, 6, 7, 8, 9, 12, 14.

## Faza 2 — Comercial și segmentare

Fluxurile 2, 5, 6, 16 + ofertele personalizate pe destinație + workflow-ul de generare conținut via
Claude API.

Partea grea e deja rezolvată: validatorul de conținut și calculul celulelor de generat există și sunt
testate. Ce lipsește e workflow-ul de batch și fluxul de review.

Dependințe: întrebările 5, 13.

## Faza 3 — Retenție și raportare

Fluxurile 12, 13, 14, 15 + dashboard KPI + documentația de replicare (aceasta din urmă e deja
scrisă: `04-onboarding-client-nou.md`).

Dependințe: întrebarea 10 (programul de recomandări e nedefinit în brief).

---

## Comenzi

```bash
npm run check                      # tot: validare + teste + build + verificare workflow-uri
npm run validate -- dor-travel     # validează configul unui client
npm run provision -- dor-travel    # dry-run în GHL (--apply ca să scrie)
                                   # alternativ: workflow-ul WF_SETUP din n8n
npm run docs -- dor-travel         # regenerează docs/01 din config
npm run form -- dor-travel         # regenerează formularul de preferințe
npm run build:n8n                  # regenerează workflow-urile (self-hosted)
npm run build:n8n:starter          # varianta pentru n8n Cloud Starter
npm run build:n8n:pro              # varianta pentru n8n Cloud Pro
npm run check:n8n                  # structură, secrete, literale de client
npm test                           # logica de runtime
```
