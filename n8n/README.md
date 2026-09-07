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

## Import

1. `npm run build:n8n && npm run check:n8n`
2. Importă cele 6 fișiere.
3. Notează id-ul fiecărui workflow (din URL) în variabilele `WF_ID_*` — vezi `n8n.env.example`.
   Workflow-urile se referă unele la altele prin aceste variabile, nu prin id-uri hardcodate.
4. La fiecare workflow: Settings → Error Workflow → `WF_ERR · Alertare la eșec`.
5. Setează `CONFIG_BASE_URL` către locul de unde n8n poate citi `config/clients/<id>.json`.

## Secrete

Nu există niciunul în JSON-uri. Tokenul GHL se citește din `$env` **direct în expresia header-ului**,
deci nu trece nici prin datele execuției — nu apare în istoricul de execuții și nici în exporturi.

Pe n8n Cloud, unde `$env` nu e disponibil în expresii, se comută pe
`integrations.ghl.secrets_mode = "n8n_credential"` și se mapează o credențială Header Auth per client.
