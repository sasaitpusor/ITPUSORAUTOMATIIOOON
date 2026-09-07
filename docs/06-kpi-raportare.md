# Raportare KPI

## Problema de rezolvat

GHL raportează open rate și click rate pe campanie. Nu raportează **venit per flux** — pentru asta e
nevoie de atribuire, adică de legătura între mesajul care a atins contactul și rezervarea care a
urmat. Se construiește separat.

## Sursa de date

Trei fluxuri de date, toate scrise de n8n:

| Tabel | Cine scrie | Ce conține | Granularitate |
|---|---|---|---|
| `send_log` | SW03, la fiecare trimitere **și la fiecare mesaj oprit** | client, contact, flux, pas, canal, categorie, tip, status, motiv, cheie de idempotență, timestamp | o linie / încercare de trimitere |
| `flow_events` | fluxurile, la intrare/ieșire | client, contact, flux, eveniment (`enter`/`exit`), motiv | o linie / tranziție |
| `attribution` | workflow de atribuire (faza 3) | contact, rezervare, valoare, flux atribuit, fereastră | o linie / rezervare |

`send_log` loghează și ce **nu** a plecat. Rata de blocare pe motiv (`no_consent`, `frequency_cap`,
`merge_fields_lipsa`) e primul semnal că ceva e greșit în date sau în configurare — de obicei înainte
ca cineva să observe că un flux „merge prost".

## Atribuire

Model: **last touch, fereastră de 30 de zile**, configurabil în `kpi.attribution`.

Când statusul unui contact devine `avans_achitat`, un workflow caută în `send_log` ultimul mesaj
comercial trimis către el în fereastră și atribuie rezervarea acelui flux. Dacă nu există niciunul,
rezervarea intră pe `direct`.

Limitele modelului, de spus clientului din start:
- last touch supraevaluează fluxurile de închidere (Last Minute) și subevaluează nurturing-ul, care
  face munca de dinainte;
- un contact atins pe mai multe canale primește atribuirea pe ultimul, nu pe cel care a contat;
- fără parametri de campanie pe linkuri, traficul direct pe site nu se poate lega de mesaj.

Pentru o citire onestă, raportul arată **și** first touch alături de last touch. Diferența dintre ele
e informația utilă.

## KPI raportate

| KPI | Sursă | Calcul |
|---|---|---|
| Open Rate | GHL, per template | deschideri unice / livrate |
| Click Rate | GHL, per template | click-uri unice / livrate |
| Rata de răspuns | GHL conversations + `send_log` | răspunsuri în 7 zile / trimise |
| Solicitări de ofertă | tag `flux_solicitare_oferta` | număr, pe perioadă |
| Conversie în rezervare | `flow_events` | contacte cu `status_avans_achitat` / contacte atinse |
| Valoare medie rezervare | `attribution` | sumă valori / număr rezervări |
| **Venit per flux** | `attribution` | sumă valori atribuite fiecărui flux |
| Clienți reactivați | `flow_events` | intrări în `reactivation_*` urmate de rezervare în 60 de zile |
| Clienți recurenți | GHL | contacte cu ≥ 2 rezervări |
| Raport de conținut | `send_log`, coloana categorie | ponderea fiecărei categorii pe 30 de zile, față de 40/20/20/20 |

Ultimul e cel pe care majoritatea sistemelor îl declară și nu îl măsoară. Fiecare piesă de conținut
poartă categoria ei prin tot lanțul, tocmai ca raportul să fie verificabil.

## Destinație

Google Sheets ca sink (configurabil: `integrations.reporting.sink`), Looker Studio deasupra pentru
vizualizare. Motivul alegerii: clientul poate deschide foaia și verifica singur cifrele. O bază de
date ar fi mai curată tehnic și mai opacă pentru cine trebuie să aibă încredere în raport.

Migrarea la BigQuery/Postgres când volumul o cere înseamnă schimbarea unui singur node în SW03.

## Dashboard (faza 3)

Trei pagini:
1. **Sănătatea sistemului** — trimiteri, blocări pe motiv, erori. Se citește zilnic în primele
   săptămâni.
2. **Performanța fluxurilor** — per flux: trimise, open, click, răspunsuri, rezervări atribuite, venit.
3. **Bază și segmente** — dimensiunea segmentelor pe axă, acoperirea preferințelor (câte contacte au
   profil complet), evoluția consimțămintelor.
