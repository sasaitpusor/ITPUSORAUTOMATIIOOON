# Checklist: pornirea unui client nou

> Livrabilul 6 din brief. Criteriul de terminare al proiectului: un client nou intră în funcțiune
> urmând **exclusiv** acest checklist, fără să se modifice niciun workflow.
>
> Timp estimat, cu accesele deja obținute: ~2 ore, din care majoritatea așteptare (DNS, aprobări).

## 0. Precondiții (le obține clientul, nu implementatorul)

- [ ] Sub-cont GoHighLevel creat
- [ ] Private Integration Token emis, cu scopurile din `integrations.ghl.required_pit_scopes`
- [ ] Domeniu de trimitere cu SPF, DKIM și DMARC configurate și verificate
- [ ] Listă de consultanți: nume, email, telefon, `ghl_user_id`
- [ ] Decizie pe canale: se folosește WhatsApp? prin ce provider?
- [ ] Bază de contacte exportată, cu **consimțământ documentat pe canal** (canal, dată, sursă)

## 1. Configurația

- [ ] `cp config/clients/_template.json config/clients/<client-id>.json`
- [ ] Completează fiecare `TODO` din fișier. Secțiunile, în ordinea în care contează:
  - `client` — identitate, fus orar, monedă
  - `brand_voice` — tonul și ce nu spune brandul ăsta niciodată
  - `taxonomy.axes` — destinațiile, orașele de plecare, pragurile de buget ale **acestui** client
  - `custom_fields` — copiază lista din configul unui client existent și ajustează
  - `consultants.list`
  - `booking` — procent avans, termen de plată finală
  - `flows` — activează ce e relevant; timing-ul e aici, nu în workflow-uri
  - `sending_rules` — ferestre orare, plafon de frecvență
- [ ] `npm run validate -- <client-id>` → trebuie să iasă ✓
- [ ] Rezolvă avertismentele sau notează conștient de ce rămân (ex. WhatsApp încă neaprobat)

## 2. Provisioning în GHL

Două căi, aceeași logică de plan, același rezultat. Alege după cine are acces la API-ul GHL.

**Varianta A — script** (mașina de pe care rulezi ajunge la `services.leadconnectorhq.com`):

- [ ] `export GHL_PIT=...` și `export <LOCATION_ID_ENV>=...` (numele e în config)
- [ ] `npm run provision -- <client-id>` — dry-run, citește planul
- [ ] Verifică: numărul de custom fields și tag-uri de creat e cel așteptat
- [ ] `npm run provision -- <client-id> --apply`

**Varianta B — workflow n8n** (când rețeaua ta blochează API-ul GHL, sau pur și simplu preferi
interfața): importă `WF_SETUP_provisioning.json`, deschide formularul lui, scrie id-ul clientului,
alege „Doar planul", verifică raportul, apoi rulează din nou cu „Aplică".
Presupune n8n deja configurat — vezi pasul 3.
- [ ] Rezolvă manual eventualele conflicte de tip de câmp (scriptul nu schimbă un `dataType` pe un
      câmp deja populat — ar pierde date)
- [ ] `npm run docs -- <client-id>` — generează documentația schemei pentru client

## 3. n8n

Pașii de la 3.1 se fac **o singură dată pe instanță**, nu la fiecare client.

### 3.1 O dată pe instanță
- [ ] `npm run build:n8n && npm run check:n8n`
- [ ] Importă cele 6 workflow-uri din `n8n/workflows/`
- [ ] Notează id-ul fiecărui workflow (din URL) și pune-l în variabilele `WF_ID_*`
      (`n8n/n8n.env.example` are lista)
- [ ] Setează `CONFIG_BASE_URL` către locul de unde n8n poate citi `config/clients/<id>.json`
- [ ] Credențiale: SMTP pentru alertare, Google Sheets pentru raportare
- [ ] La fiecare workflow: Settings → **Error Workflow** → `WF_ERR · Alertare la eșec`
- [ ] Activează `WF00 · Formular preferințe`

### 3.2 Per client
- [ ] `GHL_PIT_<CLIENT_ID>` — tokenul (majuscule, `-` devine `_`)
- [ ] `GHL_LOCATION_ID_<CLIENT_ID>` — id-ul sub-contului
- [ ] `FORM_SECRET_<CLIENT_ID>` — un secret aleatoriu pentru formular
- [ ] Repornește n8n (variabilele de mediu se citesc la pornire)

> Dacă n8n rulează pe Cloud, `$env` nu e disponibil în expresii: setează
> `integrations.ghl.secrets_mode = "n8n_credential"` și mapează o credențială Header Auth per client.
> Vezi întrebarea 1 din `02-intrebari-deschise.md`.

## 4. Formularul de preferințe

- [ ] `npm run form -- <client-id>` → `forms/<client-id>.html`
- [ ] Publică fișierul și setează în pagină:
      `window.PREFERINTE_ENDPOINT` (URL-ul webhook-ului WF00) și `window.PREFERINTE_SECRET`
- [ ] Trimite formularul cu un contact de test și verifică în GHL: custom fields populate,
      tag-uri aplicate, email de confirmare primit

## 5. Import contacte

- [ ] Mapează coloanele de consimțământ: `consim_<canal>`, `consim_<canal>_data`, `consim_<canal>_sursa`
- [ ] Importă cu tag-ul de ciclu de viață `ciclu_import`
- [ ] **Contactele fără consimțământ documentat nu primesc tag de consimțământ.** Sistemul nu le va
      trimite nimic comercial — ăsta e comportamentul corect, nu un bug
- [ ] Pentru o bază mare, eșalonează importul: nu declanșa Welcome pe toată baza într-o zi

## 6. Testare înainte de go-live

- [ ] Parcurge `05-plan-testare.md`, secțiunea T0 (fundație) — obligatoriu
- [ ] Parcurge scenariile fazei 1 pe contacte de test
- [ ] Verifică jurnalul de trimiteri pe contactul de test: idempotență, plafon, ferestre orare
- [ ] Verifică că alertarea funcționează: strică intenționat o variabilă și confirmă că vine emailul

## 7. Go-live

- [ ] Activează fluxurile fazei 1
- [ ] Primele 48h: urmărește `send_log` zilnic — rata de `blocked` și motivele
- [ ] Abia după ce faza 1 e stabilă, activează faza 2

---

## Ce NU e pe listă, intenționat

Nu apare niciun pas de tipul „deschide workflow-ul X și schimbă Y". Dacă la un client nou ai nevoie
de un astfel de pas, **e un bug de arhitectură** — raportează-l în loc să editezi nodul. Verificarea
automată `npm run check:n8n` există exact ca să prindă asta.
