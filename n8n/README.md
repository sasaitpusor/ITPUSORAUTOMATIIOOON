# Workflow-uri n8n

JSON-urile din `workflows/` sunt **generate** de `scripts/build-n8n.mjs`. Nu le edita direct și nu
edita în n8n cu intenția de a păstra modificarea — modifică sursa și rulează `npm run build:n8n`.

## De ce generate

- rămân client-agnostice: primesc `client_id` la intrare și își încarcă configul la runtime;
- logica de business (gardă, randare, mapare formular) se inlinează din `runtime/*.mjs`, exact
  fișierele acoperite de `npm test` — ce e testat e ce rulează;
- diff-urile din git arată schimbări de logică, nu mutări de casete pe canvas.

## Workflow-uri

| Fișier | Rol | Intrare |
|---|---|---|
| `SW00_load_client_config.json` | încarcă și cachează configul clientului | `{ client_id }` |
| `SW01_ghl_api_request.json` | wrapper GHL API v2: auth, header `Version`, retry, erori descriptive | `{ client_id, method, path, body?, query? }` |
| `SW02_send_guard.json` | decide dacă mesajul pleacă, se amână sau se renunță | `{ client_id, contact, request }` |
| `SW03_send_message.json` | **singura cale prin care pleacă un mesaj** | `{ client_id, contact, request, template }` |
| `WF00_preferences_intake.json` | formularul de preferințe → GHL | webhook `POST /preferinte/:client_id` |
| `WF_ERR_alerting.json` | alertare la eșec, setat ca Error Workflow pe toate | — |
| `WF_SETUP_provisioning.json` | creează în GHL câmpurile, tag-urile și custom values-urile cerute de config | formular `/form/provisioning-ghl` |

## Ținte de rulare

Aceeași sursă, trei ieșiri, fiindcă n8n expune setările de instanță diferit după unde rulează:

| Comandă | Ținta | Cum ajung setările în workflow | Multi-client |
|---|---|---|---|
| `npm run build:n8n` | self-hosted | `$env`, căutare dinamică după `client_id` | da |
| `npm run build:n8n:pro` | n8n Cloud **Pro** | `$vars` (Variables), la fel de dinamic | da |
| `npm run build:n8n:starter` | n8n Cloud **Starter** | marcaje completate o dată la import + credențială | **nu — o agenție per instanță** |

Starter nu are nici variabile de mediu, nici Variables. Tokenul GHL devine o credențială fixă pe
node, deci nu poate fi ales după `client_id`. E suficient pentru un pilot cu o singură agenție;
la a doua treci pe Pro și regenerezi — marcajele dispar, nu se editează niciun node.

Ieșirea pentru Starter vine cu `cloud-starter/IMPORT.md`, generat, care listează exact ce marcaj se
completează în ce node.

`npm run build:n8n` le generează pe toate trei, în `workflows/<țintă>/`. Alegi directorul la import;
nu trebuie să regenerezi nimic ca să schimbi ținta.

Pentru mediul local de învățat, folosește `workflows/self-hosted/` — vezi `docs/08-n8n-local.md`.

## Import

1. `npm run build:n8n && npm run check:n8n` — generează toate cele trei ținte
2. Importă cele 6 fișiere.
3. Notează id-ul fiecărui workflow (din URL) în variabilele `WF_ID_*` — vezi `n8n.env.example`.
   Workflow-urile se referă unele la altele prin aceste variabile, nu prin id-uri hardcodate.
4. La fiecare workflow: Settings → Error Workflow → `WF_ERR · Alertare la eșec`.
5. Setează `CONFIG_BASE_URL` către locul de unde n8n poate citi `config/clients/<id>.json`.
6. Rulează `WF_SETUP` din formularul lui ca să provisionezi sub-contul GHL.

## Provisioning: script sau workflow

`scripts/provision-ghl.mjs` și `WF_SETUP` fac același lucru și **împart aceeași funcție de plan**
(`runtime/provision.mjs`), deci dau același rezultat. Alegi după cine are acces la API-ul GHL:

- **scriptul**, dacă rulezi de pe o mașină cu acces la `services.leadconnectorhq.com`;
- **workflow-ul**, dacă nu — n8n rulează oricum în rețeaua în care GHL e accesibil.

Ambele sunt idempotente și au mod „doar planul". Ambele raportează conflictele de tip de câmp în loc
să suprascrie un câmp populat.

## Secrete

Nu există niciunul în JSON-uri. Tokenul GHL se citește din `$env` **direct în expresia header-ului**,
deci nu trece nici prin datele execuției — nu apare în istoricul de execuții și nici în exporturi.

Pe n8n Cloud, unde `$env` nu e disponibil în expresii, se comută pe
`integrations.ghl.secrets_mode = "n8n_credential"` și se mapează o credențială Header Auth per client.
