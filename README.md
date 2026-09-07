# Automatizare marketing multi-canal pentru agenții de turism

n8n + GoHighLevel + Claude API. Construit ca **produs alb, parametrizabil**: un client nou se pornește
completând un fișier de config, fără să se modifice niciun workflow.

Client pilot: **Dor Travel** — produsul „Destinația Ta Perfectă".

## Principiul care ține tot sistemul

Comunicarea e personalizată pe preferințele fiecărui contact. Nu se trimit newslettere identice către
toată baza. Segmentarea e pe tag-uri combinate (un contact e simultan în mai multe segmente), iar
fiecare mesaj comercial e filtrat pe destinație, buget, tip turist, perioadă și oraș de plecare.

## Structura

```
config/
  schema/client.config.schema.json   schema configului, cu explicații pe fiecare câmp
  clients/dor-travel.json            configul clientului pilot
  clients/_template.json             punctul de plecare pentru un client nou
n8n/
  runtime/                           logica de business, testabilă în Node și inlinată în node-uri Code
  workflows/self-hosted/             JSON generat pentru n8n self-hosted sau local ($env)
  workflows/cloud-pro/               idem, pentru n8n Cloud Pro ($vars) — multi-client
  workflows/cloud-starter/           idem, pentru Cloud Starter (marcaje + credențială) + IMPORT.md
docker-compose.local.yml             n8n local cu Docker, pentru învățat și testat
scripts/                             validare, provisioning GHL, generare docs/formular/workflow-uri, teste
forms/                               formularul de preferințe, generat din taxonomia clientului
docs/                                arhitectură, schemă GHL, întrebări deschise, onboarding, testare, KPI
```

## Start rapid

```bash
npm run check     # validare config + 37 teste + build workflow-uri + verificări
```

Nu are dependințe: rulează pe Node 18+ fără `npm install`.

## Documentație

| Document | Pentru ce |
|---|---|
| [docs/00-arhitectura.md](docs/00-arhitectura.md) | ce e în GHL, ce e în n8n și de ce; traseul unui mesaj |
| [docs/01-ghl-schema-si-taguri.md](docs/01-ghl-schema-si-taguri.md) | toate câmpurile și tag-urile (generat din config) |
| [docs/02-intrebari-deschise.md](docs/02-intrebari-deschise.md) | **ce blochează implementarea acum** |
| [docs/03-plan-livrare.md](docs/03-plan-livrare.md) | ce e livrat, ce urmează |
| [docs/04-onboarding-client-nou.md](docs/04-onboarding-client-nou.md) | checklist-ul de replicare |
| [docs/05-plan-testare.md](docs/05-plan-testare.md) | scenarii per flux |
| [docs/06-kpi-raportare.md](docs/06-kpi-raportare.md) | sursele de date și atribuirea pe flux |
| [docs/07-generare-continut-claude.md](docs/07-generare-continut-claude.md) | cum se generează conținutul și ce nu are voie să genereze |
| [docs/08-n8n-local.md](docs/08-n8n-local.md) | mediu local cu Docker, pentru învățat și testat |

## Reguli nenegociabile, aplicate de cod

Nu sunt convenții — pică build-ul sau testele dacă se încalcă.

- **Fără consimțământ pe canal, nu se trimite** — indiferent de flux.
- **Un email cu „Bună, {{prenume}}" gol nu pleacă niciodată.** Valorile financiare lipsă opresc
  trimiterea; nu se completează cu nimic.
- **Claude nu generează cifre** — prețuri, procente, disponibilități, date, nume de hoteluri. Un text
  care le conține e respins automat, înainte de review uman.
- **Nicio credențială în config sau în workflow-uri.** Verificat la fiecare build.
- **Niciun literal de client într-un workflow.** `npm run check:n8n` compară workflow-urile cu
  configurile existente și pică dacă găsește numele agenției, o destinație sau un consultant.
- **Re-rularea unui flux nu retrimite** ce s-a trimis deja.

## Stare

Faza 0 (fundația) e livrată și validată local. Ce urmează și ce o blochează:
[docs/03-plan-livrare.md](docs/03-plan-livrare.md) și [docs/02-intrebari-deschise.md](docs/02-intrebari-deschise.md).
