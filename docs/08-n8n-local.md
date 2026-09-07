# n8n local — pentru învățat și testat

> Scopul: să înțelegi cum funcționează sistemul, gratis și fără limită de execuții, **în paralel**
> cu pilotul de pe Cloud. Nu în locul lui.
>
> De ce nu în locul lui: aici n8n rulează pe calculatorul tău. Un SMS de reminder programat la 09:00
> nu pleacă dacă laptopul e închis. Local e pentru experimentat; producția stă pe Cloud.

Nu ai nevoie de Node, npm sau de linie de comandă avansată. Doar Docker și copy-paste.

---

## 1. Instalează Docker Desktop

[docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/) — Windows sau
Mac, instalare normală, next-next-finish. După instalare, pornește-l și lasă-l deschis (are o
iconiță de balenă în bara de sus/jos).

Ca să verifici că merge, deschide un terminal (pe Windows: **PowerShell**; pe Mac: **Terminal**) și scrie:

```bash
docker --version
```

Dacă îți răspunde cu un număr de versiune, ești bun.

## 2. Ia proiectul

Fără git, direct din browser: pe pagina repo-ului, butonul verde **Code** → **Download ZIP**.
Ai grijă să fii pe branch-ul `claude/marketing-automation-system-om2uk0`.

Dezarhivezi undeva unde găsești ușor, de exemplu `Documente/dor-travel`.

În terminal, intri în folderul ăla:

```bash
cd Documente/dor-travel          # sau unde l-ai pus
```

> Truc: în loc să scrii calea de mână, scrie `cd ` (cu spațiu) și trage folderul peste fereastra de
> terminal — se completează singură.

## 3. Pune tokenul

Copiază `.env.local.example` într-un fișier nou numit `.env.local` și deschide-l cu orice editor de
text. Completează:

```
GHL_PIT_DOR_TRAVEL=pit-...
GHL_LOCATION_ID_DOR_TRAVEL=vL4kcgP3mrXaUdOF5PW2
```

Restul le lași goale deocamdată.

> `.env.local` nu ajunge niciodată în git — e în `.gitignore`. Tokenul rămâne pe calculatorul tău.

## 4. Pornește

```bash
docker compose --env-file .env.local -f docker-compose.local.yml up -d
```

Prima dată durează un minut-două: descarcă n8n. Pornesc două lucruri:

- **n8n** — pe http://localhost:5678
- **config** — un server minuscul care servește `config/clients/dor-travel.json` către n8n, exact
  cum o va face și în producție

Deschide http://localhost:5678 și fă-ți un cont de owner (email + parolă, rămân local).

## 5. Importă workflow-urile

În n8n: meniul din stânga sus → **Import from File**. Imporți, pe rând, cele **7 fișiere** din
`n8n/workflows/self-hosted/`:

| Fișier | Ce face |
|---|---|
| `SW00_load_client_config.json` | încarcă configul clientului |
| `SW01_ghl_api_request.json` | vorbește cu GoHighLevel |
| `SW02_send_guard.json` | decide dacă un mesaj are voie să plece |
| `SW03_send_message.json` | trimite efectiv |
| `WF00_preferences_intake.json` | formularul de preferințe |
| `WF_ERR_alerting.json` | alertează când ceva pică |
| `WF_SETUP_provisioning.json` | creează câmpurile și tag-urile în GHL |

> Folosește varianta **`self-hosted/`**, nu `cloud-starter/`. Local ai variabile de mediu, deci merge
> forma cea bună, fără marcaje de completat manual.

## 6. Leagă workflow-urile între ele

Workflow-urile se cheamă unele pe altele prin id-uri, iar id-ul îl afli abia după import. Deschide
fiecare workflow și copiază id-ul din bara de adrese:

```
http://localhost:5678/workflow/AbCdEf123456
                               └─── ăsta ───┘
```

Îl pui în `.env.local`, la linia potrivită. Când le-ai completat pe toate șapte:

```bash
docker compose --env-file .env.local -f docker-compose.local.yml restart n8n
```

Variabilele de mediu se citesc doar la pornire, de-aia e nevoie de repornire.

## 7. Prima probă: provisioning-ul GHL

Ăsta e momentul adevărului — verifică tokenul, scopurile și sub-contul, **fără să scrie nimic**.

1. Deschide workflow-ul `WF_SETUP · Provisioning GHL`
2. Pe nodul de formular, apasă pe link-ul de test al formularului
3. Client: `dor-travel` · Mod: **Doar planul**
4. Trimite

Ar trebui să-ți raporteze **131 de operațiuni**: 42 custom fields, 82 tag-uri, 7 custom values.
Trimite-mi raportul.

Dacă vrei să și creezi efectiv, rulezi din nou cu **Aplică**. Poți face asta liniștit din local — e
același sub-cont GHL, iar operațiunea e idempotentă: dacă o rulezi de două ori, a doua oară nu face
nimic.

## 8. Când termini

```bash
docker compose --env-file .env.local -f docker-compose.local.yml down
```

Datele n8n (workflow-urile importate, credențialele) rămân salvate. Data viitoare pornești cu `up -d`
și găsești totul acolo.

---

## Ce merge prost, de obicei

| Simptom | Ce e |
|---|---|
| `docker: command not found` | Docker Desktop nu e pornit, sau terminalul era deschis dinainte de instalare — închide-l și deschide altul |
| n8n pornește dar `$env` e gol | Ai pornit fără `--env-file .env.local` |
| „SW00: variabila CONFIG_BASE_URL nu e setată" | Idem — repornește cu `--env-file` |
| „SW01: lipsește variabila de mediu GHL_PIT_DOR_TRAVEL" | Tokenul nu e în `.env.local`, sau ai uitat `restart` după ce l-ai pus |
| Un workflow zice că nu găsește sub-workflow-ul | Nu ai completat `WF_ID_*` în `.env.local`, sau n-ai repornit după |
| Formularul de preferințe dă „secret invalid" | Trimite antetul `X-Form-Secret` cu valoarea din `FORM_SECRET_DOR_TRAVEL` |
| Port 5678 ocupat | Rulează deja o instanță n8n. `docker compose ... down` întâi |

## Ce înveți aici și îți folosește pe Cloud

- cum arată o execuție și cum citești ce a intrat/ieșit din fiecare node
- cum se leagă sub-workflow-urile între ele
- cum se comportă garda de trimitere: încearcă să trimiți un mesaj comercial către un contact fără
  consimțământ și uită-te la motivul din log
- cum arată planul de provisioning înainte să-l aplici

Toate se transferă unu-la-unu pe Cloud. Diferă doar de unde își ia n8n setările.
