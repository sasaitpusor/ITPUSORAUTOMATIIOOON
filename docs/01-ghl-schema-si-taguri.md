# Schema GHL — custom fields și tag-uri

> Generat din `config/clients/dor-travel.json` de `scripts/gen-docs.mjs`. **Nu edita manual** — modifică
> configul și regenerează cu `npm run docs -- dor-travel`.

Client: **Dor Travel** · produs: *Destinația Ta Perfectă* · fus orar: `Europe/Bucharest`

| | |
|---|---|
| Custom fields | 42 |
| Tag-uri de segmentare | 53 |
| Tag-uri de sistem | 29 |
| Custom values | 7 |
| Fluxuri active | 17 din 18 |
| Celule de conținut de generat | 134 (× 2 variante = 268 texte de revizuit) |

## 1. Custom fields

Se creează automat cu `npm run provision -- dor-travel --apply`. Opțiunile câmpurilor de tip
select se derivă din axele de taxonomie — nu se scriu de două ori.

### Preferințe de călătorie

| Cheie | Nume în GHL | Tip | Opțiuni |
|---|---|---|---|
| `oras_plecare` | Oraș de plecare | SINGLE_OPTIONS | Cluj-Napoca · București · Iași · Timișoara · Sibiu · Oradea · Brașov · Constanța · Budapesta · Chișinău · Belgrad |
| `destinatii_favorite` | Destinații favorite | MULTIPLE_OPTIONS | Grecia · Turcia · Egipt · Croația · Albania · Cipru · Italia · Emiratele Arabe Unite |
| `tip_transport` | Tip transport | SINGLE_OPTIONS | Avion |
| `buget_estimat` | Buget estimat | SINGLE_OPTIONS | sub 700€ · 700–1000€ · 1000–1500€ · peste 1500€ |
| `durata_preferata` | Durată preferată | SINGLE_OPTIONS | 5 nopți · 7 nopți · 10 nopți · 14 nopți |
| `categoria_hotel` | Categoria hotel | SINGLE_OPTIONS | 3* · 4* · 5* |
| `regim_masa` | Regim de masă | SINGLE_OPTIONS | Mic dejun · Demipensiune · All Inclusive · Ultra All Inclusive |
| `bagaj` | Bagaj | SINGLE_OPTIONS | Doar cabină · Bagaj inclus |
| `tip_turist` | Tip turist | SINGLE_OPTIONS | Familie · Cuplu · Senior · Grup de prieteni · Solo |
| `perioada_preferata` | Perioada preferată | MULTIPLE_OPTIONS | Mai · Iunie · Iulie · August · Septembrie · Octombrie |

### Operațional

| Cheie | Nume în GHL | Tip | Opțiuni |
|---|---|---|---|
| `status_rezervare` | Status rezervare curentă | SINGLE_OPTIONS | Solicitare · Avans achitat · Plătit integral · Plecat · Revenit |
| `data_ultima_interactiune` | Data ultimei interacțiuni | DATE | — |
| `data_ultima_rezervare` | Data ultimei rezervări | DATE | — |
| `consultant_alocat` | Consultant alocat | TEXT | — |
| `consultant_email` | Email consultant | TEXT | — |
| `consultant_telefon` | Telefon consultant | PHONE | — |

### Rezervare curentă

| Cheie | Nume în GHL | Tip | Opțiuni |
|---|---|---|---|
| `data_plecare` | Data plecării | DATE | — |
| `data_intoarcere` | Data întoarcerii | DATE | — |
| `data_check_in` | Data check-in | DATE | — |
| `destinatie_rezervata` | Destinația rezervată | TEXT | — |
| `hotel_rezervat` | Hotelul rezervat | TEXT | — |
| `numar_nopti` | Numărul de nopți | NUMERICAL | — |
| `regim_masa_rezervat` | Tipul de masă (rezervat) | TEXT | — |
| `valoare_avans` | Valoarea avansului achitat | MONETARY | — |
| `sold_ramas` | Soldul rămas de achitat | MONETARY | — |
| `data_limita_plata_finala` | Data limită plata finală | DATE | — |
| `referinta_rezervare` | Referință rezervare (ID extern) | TEXT | — |

### Conformitate

| Cheie | Nume în GHL | Tip | Opțiuni |
|---|---|---|---|
| `consim_email` | Consimțământ email | CHECKBOX | — |
| `consim_email_data` | Consimțământ email — dată | DATE | — |
| `consim_email_sursa` | Consimțământ email — sursă | TEXT | — |
| `consim_sms` | Consimțământ SMS | CHECKBOX | — |
| `consim_sms_data` | Consimțământ SMS — dată | DATE | — |
| `consim_sms_sursa` | Consimțământ SMS — sursă | TEXT | — |
| `consim_whatsapp` | Consimțământ WhatsApp | CHECKBOX | — |
| `consim_whatsapp_data` | Consimțământ WhatsApp — dată | DATE | — |
| `consim_whatsapp_sursa` | Consimțământ WhatsApp — sursă | TEXT | — |

### Date generale

| Cheie | Nume în GHL | Tip | Opțiuni |
|---|---|---|---|
| `data_nastere` | Data nașterii | DATE | — |
| `oras_resedinta` | Oraș | TEXT | — |

### Guvernanță trimiteri

| Cheie | Nume în GHL | Tip | Opțiuni |
|---|---|---|---|
| `ultim_mesaj_comercial` | Ultimul mesaj comercial (ISO) | TEXT | — |
| `mesaje_comerciale_7z` | Mesaje comerciale în ultimele 7 zile | NUMERICAL | — |
| `flux_activ_exclusiv` | Flux activ exclusiv | TEXT | — |
| `jurnal_trimiteri` | Jurnal trimiteri (JSON) | LARGE_TEXT | — |

## 2. Tag-uri de segmentare

Convenție: prefix pe axă, `lower_snake`. Prefixul permite filtrare programatică
(«toate tag-urile care încep cu `dest_`») fără liste hardcodate în workflow-uri.

**`dest_*`** — axa `destination`, câmp `destinatii_favorite`, multi-select

`dest_grecia` (Grecia) · `dest_turcia` (Turcia) · `dest_egipt` (Egipt) · `dest_croatia` (Croația) · `dest_albania` (Albania) · `dest_cipru` (Cipru) · `dest_italia` (Italia) · `dest_eau` (Emiratele Arabe Unite)

**`plecare_*`** — axa `departure_city`, câmp `oras_plecare`, single-select

`plecare_cluj` (Cluj-Napoca) · `plecare_bucuresti` (București) · `plecare_iasi` (Iași) · `plecare_timisoara` (Timișoara) · `plecare_sibiu` (Sibiu) · `plecare_oradea` (Oradea) · `plecare_brasov` (Brașov) · `plecare_constanta` (Constanța) · `plecare_budapesta` (Budapesta) · `plecare_chisinau` (Chișinău) · `plecare_belgrad` (Belgrad)

**`transport_*`** — axa `transport`, câmp `tip_transport`, single-select

`transport_avion` (Avion)

**`buget_*`** — axa `budget`, câmp `buget_estimat`, single-select

`buget_sub_700` (sub 700€) · `buget_700_1000` (700–1000€) · `buget_1000_1500` (1000–1500€) · `buget_peste_1500` (peste 1500€)

**`durata_*`** — axa `duration`, câmp `durata_preferata`, single-select

`durata_5` (5 nopți) · `durata_7` (7 nopți) · `durata_10` (10 nopți) · `durata_14` (14 nopți)

**`hotel_*`** — axa `hotel_category`, câmp `categoria_hotel`, single-select

`hotel_3s` (3*) · `hotel_4s` (4*) · `hotel_5s` (5*)

**`masa_*`** — axa `meal_plan`, câmp `regim_masa`, single-select

`masa_mic_dejun` (Mic dejun) · `masa_demipensiune` (Demipensiune) · `masa_ai` (All Inclusive) · `masa_uai` (Ultra All Inclusive)

**`bagaj_*`** — axa `luggage`, câmp `bagaj`, single-select

`bagaj_cabina` (Doar cabină) · `bagaj_inclus` (Bagaj inclus)

**`turist_*`** — axa `tourist_type`, câmp `tip_turist`, single-select

`turist_familie` (Familie) · `turist_cuplu` (Cuplu) · `turist_senior` (Senior) · `turist_grup_prieteni` (Grup de prieteni) · `turist_solo` (Solo)

**`perioada_*`** — axa `period`, câmp `perioada_preferata`, multi-select

`perioada_mai` (Mai) · `perioada_iunie` (Iunie) · `perioada_iulie` (Iulie) · `perioada_august` (August) · `perioada_septembrie` (Septembrie) · `perioada_octombrie` (Octombrie)

**`status_*`** — axa `booking_status`, câmp `status_rezervare`, single-select, exclusiv (o valoare elimină restul)

`status_solicitare` (Solicitare) · `status_avans_achitat` (Avans achitat) · `status_platit_integral` (Plătit integral) · `status_plecat` (Plecat) · `status_revenit` (Revenit)

## 3. Tag-uri de sistem

**Consimțământ pe canal** — Se setează la opt-in. Fără el, niciun mesaj comercial nu pleacă pe acel canal.

`consim_email` · `consim_sms` · `consim_whatsapp`

**Opt-out pe canal** — Setat de dezabonare email sau de STOP pe SMS. Oprește toate fluxurile comerciale pe canalul respectiv.

`optout_email` · `optout_sms` · `optout_whatsapp`

**Stare de flux** — Marchează contactul ca fiind într-un flux. Baza gărzii de suprimare între fluxuri.

`flux_welcome` · `flux_preferences_update` · `flux_offer_request` · `flux_offer_no_response` · `flux_booking_confirmed` · `flux_pre_departure` · `flux_in_trip` · `flux_pre_return` · `flux_post_return` · `flux_review_request` · `flux_nurturing` · `flux_early_booking` · `flux_last_minute` · `flux_personalized_offers` · `flux_birthday` · `flux_referral` · `flux_reactivation_6m` · `flux_reactivation_12m`

**Ciclu de viață** — Poziția contactului în relația cu agenția.

`ciclu_import` · `ciclu_lead` · `ciclu_client` · `ciclu_client_fidel` · `ciclu_inactiv`

## 4. Custom values

Valori de brand injectate în template-urile GHL, ca textele să nu conțină numele agenției hardcodat.

| Nume în GHL | Sursă în config | Valoare curentă |
|---|---|---|
| `agency_name` | `client.agency_name` | Dor Travel |
| `product_name` | `client.product_name` | Destinația Ta Perfectă |
| `support_hours` | `client.support_hours` | Luni–Vineri 09:00–18:00 |
| `deposit_percent` | `booking.deposit_percent` | 20 |
| `final_payment_days_before` | `booking.final_payment_days_before_departure` | 30 |
| `unsubscribe_url` | `compliance.unsubscribe_url` | TBD |
| `positioning_statement` | `brand_voice.positioning_statement` | Nu vindem camere de hotel. Recomandam vacanta potrivita pentru fiecare om, in pachet complet: zbor, transfer, cazare, mese si suport de la plecare pana la intoarcere. |

## 5. Merge fields și fallback-uri

Regula: un email cu «Bună, {{prenume}}» gol nu pleacă niciodată.

| Token | Sursă | Dacă lipsește |
|---|---|---|
| `{{prenume}}` | `contact.firstName` | se înlocuiește rândul cu "Bună!" |
| `{{destinatie_rezervata}}` | `custom_field.destinatie_rezervata` | **mesajul nu pleacă** și se ridică alertă |
| `{{hotel_rezervat}}` | `custom_field.hotel_rezervat` | **mesajul nu pleacă** și se ridică alertă |
| `{{oras_plecare}}` | `custom_field.oras_plecare` | **mesajul nu pleacă** și se ridică alertă |
| `{{data_plecare}}` | `custom_field.data_plecare` | **mesajul nu pleacă** și se ridică alertă |
| `{{numar_nopti}}` | `custom_field.numar_nopti` | **mesajul nu pleacă** și se ridică alertă |
| `{{regim_masa_rezervat}}` | `custom_field.regim_masa_rezervat` | se elimină propoziția care îl conține |
| `{{valoare_avans}}` | `custom_field.valoare_avans` | **mesajul nu pleacă** și se ridică alertă |
| `{{sold_ramas}}` | `custom_field.sold_ramas` | **mesajul nu pleacă** și se ridică alertă |
| `{{data_limita_plata_finala}}` | `custom_field.data_limita_plata_finala` | **mesajul nu pleacă** și se ridică alertă |
| `{{consultant_name}}` | `custom_field.consultant_alocat` | se folosește "Echipa Dor Travel" |
| `{{consultant_email}}` | `custom_field.consultant_email` | se folosește "TBD" |
| `{{consultant_phone}}` | `custom_field.consultant_telefon` | se folosește "TBD" |
| `{{agency_name}}` | `config.client.agency_name` | **mesajul nu pleacă** și se ridică alertă |

## 6. Fluxuri

| Flux | Fază | Tip | Trigger | Canale | Segmentare audiență | Variație text |
|---|---|---|---|---|---|---|
| `welcome` | 1 | lifecycle | tag_added `ciclu_import` | email | — | — |
| `preferences_update` | 1 | transactional | webhook | email | — | — |
| `offer_request` | 1 | transactional | tag_added `flux_solicitare_oferta` | email, sms, task | — | — |
| `offer_no_response` | 1 | commercial | tag_added `flux_oferta_trimisa` | email, sms | — | — |
| `booking_confirmed` | 1 | transactional | field_changed | email | — | — |
| `pre_departure` 🔒 | 1 | transactional | scheduled_scan pe `data_plecare` `0 8 * * *` | email, sms, whatsapp | — | — |
| `in_trip` 🔒 | 1 | transactional | scheduled_scan pe `data_check_in` `0 10 * * *` | whatsapp | — | — |
| `pre_return` 🔒 | 1 | transactional | scheduled_scan pe `data_intoarcere` `0 10 * * *` | whatsapp | — | — |
| `post_return` | 1 | transactional | scheduled_scan pe `data_intoarcere` `0 11 * * *` | email | — | — |
| `review_request` | 3 | commercial | scheduled_scan pe `data_intoarcere` `0 11 * * *` | email | — | — |
| `nurturing` | 2 | commercial | cron `0 9 * * 2` | email | destination | destination |
| `early_booking` | 2 | commercial | manual_campaign | email, sms | destination, budget, period | destination |
| `last_minute` | 2 | commercial | manual_campaign | email, sms | destination, budget, tourist_type, period | destination, tourist_type |
| `personalized_offers` | 2 | commercial | manual_campaign | email | destination, budget, tourist_type, period, departure_city | destination |
| `birthday` | 2 | commercial | scheduled_scan pe `data_nastere` `0 8 * * *` | email | — | — |
| ~~`referral`~~ | 3 | commercial | tag_added `ciclu_client_fidel` | — | — | — |
| `reactivation_6m` | 3 | commercial | scheduled_scan pe `data_ultima_interactiune` `0 9 * * 3` | email | — | — |
| `reactivation_12m` | 3 | commercial | scheduled_scan pe `data_ultima_rezervare` `0 9 * * 4` | email | — | — |

🔒 = flux exclusiv: cât e activ, suprimă orice mesaj comercial către acel contact.

Fluxuri dezactivate: `referral` (docs/02-intrebari-deschise.md Q10 — mecanismul nu este definit in brief)

## 7. Reguli de trimitere aplicate de garda comună

- **email**: fără restricție orară
- **sms**: ferestre orare 09:00–20:00 (Europe/Bucharest); în afara lor mesajul se amână la începutul următoarei ferestre
- **whatsapp**: ferestre orare 09:00–20:00 (Europe/Bucharest); în afara lor mesajul se amână la începutul următoarei ferestre
- **Plafon comercial**: max 3 mesaje / 7 zile rulante, minim 24h între ele.
- **Tranzacționale**: trec peste plafon, nu se suprimă niciodată.
- **Suprimare**: cât timp contactul e în `pre_departure`, `in_trip`, `pre_return`, fluxurile comerciale nu trimit.
- **Idempotență**: cheie `{{client_id}}:{{contact_id}}:{{flow_id}}:{{step_id}}:{{occurrence_key}}`, stocată în `contact_field`.
