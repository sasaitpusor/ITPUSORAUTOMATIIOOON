# Arhitectură

## Împărțirea responsabilităților

Regula pe care o urmează tot sistemul: **ce face GHL nativ și bine rămâne în GHL.** n8n intră doar
unde GHL nu ajunge. Mutarea unui flux liniar în n8n de dragul consistenței adaugă un punct de eșec
și un cost de mentenanță fără să aducă nimic.

| Strat | Ce ține | De ce acolo |
|---|---|---|
| **GoHighLevel** | contacte, custom fields, tag-uri, conversații, task-uri către consultanți, trimiterea efectivă de email/SMS | sursă de adevăr pentru date și canalul de livrare |
| **n8n** | branching pe combinații multiple de segmente, garda de trimitere, generarea de conținut, WhatsApp, agregarea KPI | GHL nu le poate face, sau le face greoi |
| **Claude API** | textul persuasiv, inspirațional și educațional din jurul variabilelor | volum mare de variante pe segment |

### Ce NU face Claude API
Nu generează niciodată prețuri, procente de reducere, disponibilități, nume de hoteluri, date de
plecare sau termene de plată. Toate acestea vin din merge fields alimentate din GHL sau din text
scris de om. Regula e aplicată de un validator automat, nu doar declarată — vezi
`n8n/runtime/content.mjs` și `content.forbidden_in_generated` din config.

## De ce apeluri HTTP directe și nu node-ul nativ HighLevel

Node-ul nativ acoperă doar Contact / Opportunity / Task / Calendar. **Nu are resursă pentru Tags sau
Custom Values** — exact ce ține segmentarea. În plus e doar OAuth2, iar refresh token-ul are probleme
cunoscute: se rupe silențios în producție, adică fluxuri care par active dar nu mai trimit nimic.

Toate operațiunile critice trec prin **SW01 · Apel GHL API v2**, cu Private Integration Token. SW01
se ocupă de:
- header-ul `Version`, obligatoriu pe API v2 și **diferit pe resurse** (conversations cere altă
  valoare decât restul) — fără el request-ul e respins;
- retry cu backoff exponențial pe erori tranzitorii;
- erori descriptive: status, cauză probabilă și corpul răspunsului, nu „request failed".

Node-ul nativ poate fi folosit în continuare pentru operațiuni simple pe contacte, dar niciun flux
critic de segmentare nu depinde de el.

## Traseul unui mesaj

```
flux (trigger)
   │
   ├─► SW00 · încarcă configul clientului        (cache 5 min, validat la descărcare)
   │
   ├─► SW01 · citește contactul din GHL          (tag-uri + custom fields)
   │
   └─► SW03 · trimite mesaj
          │
          ├─► SW02 · garda de trimitere ─────────────────────────────┐
          │      1. canalul e disponibil?                            │
          │      2. opt-out?                    ─► drop              │
          │      3. consimțământ pe canal?      ─► drop              │
          │      4. deja trimis? (idempotență)  ─► drop              │
          │      5. e în flux exclusiv?         ─► drop (comercial)  │
          │      6. plafon de frecvență?        ─► defer             │
          │      7. fereastră orară?            ─► defer             │
          │                                                          │
          ├─► randare + fallback merge fields   ─► block dacă lipsesc valori financiare
          ├─► trimite pe canal (email/SMS/WhatsApp)
          ├─► actualizează jurnalul de pe contact
          └─► scrie linia de log                (și când mesajul NU pleacă)
```

**SW03 e singura cale prin care pleacă un mesaj.** Niciun flux nu trimite direct. Asta face ca
regulile de conformitate, plafonul de frecvență și suprimarea între fluxuri să fie garantate global,
nu reimplementate în 16 locuri.

## Cerințele non-funcționale, și unde sunt rezolvate

| Cerință | Unde |
|---|---|
| Error handling explicit, fără eșecuri silențioase | `WF_ERR · Alertare la eșec`, setat ca Error Workflow pe fiecare workflow; SW01 ridică erori descriptive |
| Idempotență — re-rularea nu retrimite | cheie `client:contact:flux:pas:ocurență` în jurnalul de pe contact, verificată în SW02 |
| Retry cu backoff, rate limits | `retryOnFail` + backoff pe nodurile HTTP; SW01 tratează 429 separat |
| Logare (contact, flux, canal, timestamp, status) | SW03 scrie o linie pentru fiecare trimitere **și** pentru fiecare mesaj oprit |
| Consimțământ pe canal | SW02, pasul 3 — înainte de orice trimitere |
| Ferestre orare și plafon de frecvență | SW02, pașii 6–7; amânare, nu pierdere |
| Suprimare între fluxuri | SW02, pasul 5 — pe tag de stare de flux, nu pe delay-uri separate |

## Reutilizabilitate

Testul din brief: *dacă adăugarea unui client nou cere editarea unui node n8n, arhitectura e greșită.*

Cum e respectat:
- workflow-urile primesc `client_id` la intrare și își încarcă configurația la runtime (SW00);
- taxonomia, tag-urile, opțiunile de câmp, textele de brand și regulile de trimitere sunt toate în
  `config/clients/<id>.json`;
- token-urile se citesc din `$env` după numele declarat în config, direct în expresia header-ului —
  nu trec nici prin JSON-ul workflow-ului, nici prin datele execuției;
- `npm run check:n8n` verifică automat că niciun literal specific unui client (nume de agenție,
  destinații, consultanți, domenii) nu a ajuns într-un workflow.

Verificarea din urmă e un test executabil, nu o convenție: dacă cineva scrie „Grecia" într-un node,
build-ul pică.

## Fluxuri: unde trăiesc

Fluxurile nu sunt 16 workflow-uri separate. Sunt **declarații în config** (`flows.*`: trigger, pași,
offset-uri, canal, categorie de conținut) executate de un număr mic de workflow-uri generice.
Consecință directă: schimbarea unui timing (14 zile → 10 zile înainte de plecare) e o modificare de
config, nu de workflow, și e vizibilă în git ca atare.
