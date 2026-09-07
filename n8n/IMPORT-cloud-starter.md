# Import în n8n Cloud Starter

Generat de `scripts/build-n8n.mjs --target=cloud-starter`.

Starter nu are nici variabile de mediu, nici Variables (`$vars` e pe Pro). De aceea
setările de instanță apar în workflow-uri ca marcaje `__COMPLETEAZA_...__` pe care le
completezi o singură dată, la import.

**Consecință de arhitectură:** pe Starter merge o singură agenție per instanță, fiindcă
tokenul GHL e o credențială fixă pe node, nu una aleasă după `client_id`. Când adaugi a
doua agenție, treci pe Pro și regenerezi cu `npm run build:n8n:pro` — marcajele dispar și
multi-client funcționează fără să atingi vreun node.

## 1. Importă workflow-urile

- [ ] `SW00_load_client_config.json`
- [ ] `SW01_ghl_api_request.json`
- [ ] `SW02_send_guard.json`
- [ ] `SW03_send_message.json`
- [ ] `WF00_preferences_intake.json`
- [ ] `WF_ERR_alerting.json`
- [ ] `WF_SETUP_provisioning.json`

## 2. Credențiale

- [ ] Header Auth, numită exact **GHL Private Integration Token** — Name: `Authorization`, Value: `Bearer pit-...`
- [ ] SMTP, pentru workflow-ul de alertare
- [ ] Google Sheets, pentru raportare

## 3. Completează marcajele

Caută fiecare marcaj în workflow-ul indicat și înlocuiește-l cu valoarea reală.

| Marcaj | Ce pui în loc |
|---|---|
| `__COMPLETEAZA_CONFIG_BASE_URL__` | URL-ul de unde n8n citește config/clients/<id>.json — SW00, nodul „Pregătește sursa configului" |
| `__COMPLETEAZA_WF_ID_SW00_LOAD_CONFIG__` | id-ul workflow-ului SW00_LOAD_CONFIG (din URL, după import) |
| `__COMPLETEAZA_GHL_LOCATION_ID__` | id-ul sub-contului GHL — SW01, nodul „Pregătește apelul" |
| `__COMPLETEAZA_WF_ID_SW02_SEND_GUARD__` | id-ul workflow-ului SW02_SEND_GUARD (din URL, după import) |
| `__COMPLETEAZA_WF_ID_SW01_GHL_API__` | id-ul workflow-ului SW01_GHL_API (din URL, după import) |
| `__COMPLETEAZA_KPI_SPREADSHEET_ID__` | foaia de raportare — SW03, nodul „Scrie în raportare" |
| `__COMPLETEAZA_FORM_SECRET__` | secretul formularului de preferințe — WF00, nodul „Validează cererea" |
| `__COMPLETEAZA_WF_ID_SW03_SEND_MESSAGE__` | id-ul workflow-ului SW03_SEND_MESSAGE (din URL, după import) |
| `__COMPLETEAZA_ALERT_EMAIL__` | adresa care primește alertele — WF_ERR, nodul „Construiește alerta" |
| `__COMPLETEAZA_ALERT_FROM_EMAIL__` | expeditorul alertelor — WF_ERR, nodul „Trimite alerta" |

Id-urile de workflow se iau din URL după import: `.../workflow/<ID>`.

## 4. Error workflow

- [ ] La fiecare workflow: Settings → Error Workflow → `WF_ERR · Alertare la eșec`

## 5. Provisioning GHL

- [ ] Deschide formularul workflow-ului `WF_SETUP · Provisioning GHL`
- [ ] Scrie id-ul clientului, alege „Doar planul", verifică raportul
- [ ] Rulează din nou cu „Aplică"

## Atenție la cota de execuții

Starter are 2.500 execuții/lună și **se oprește** când o atingi, nu te avertizează.
Urmărește-o în primele săptămâni: fluxurile tranzacționale consumă puțin, campaniile
trimise per contact consumă mult.
