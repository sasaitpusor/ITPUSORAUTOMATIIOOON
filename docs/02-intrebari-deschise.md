# Întrebări deschise — răspunsurile blochează implementarea

> Secțiunea 17 din brief. Fiecare întrebare e legată de ce anume nu poate merge mai departe fără ea,
> ca să se vadă care sunt blocante acum și care pot aștepta.
>
> Coloana „unde intră răspunsul" spune exact ce câmp din config se completează — răspunsurile nu cer
> modificări de cod.

Legendă stare: **⛔ blochează acum** · **⚠ blochează faza următoare** · **○ de confirmat înainte de go-live**

---

## Acces și infrastructură

### 1. n8n e self-hosted sau cloud? ✅ RĂSPUNS: n8n Cloud Starter, cu trecere pe Pro la al doilea client
**De ce contează:** pe self-hosted, workflow-urile citesc token-urile din `$env` după `client_id`, deci
un client nou nu cere atins niciun node. n8n Cloud nu expune variabile de mediu arbitrare în expresii:
acolo trebuie o credențială Header Auth mapată manual per client, ceea ce schimbă modelul de
onboarding și strică testul de reutilizabilitate din brief.

**Decizia și de ce:** nimeni din echipă nu întreține un server, ceea ce elimină self-hosted. Baza e
sub 1.000 de contacte, deci încape în cele 2.500 de execuții/lună ale planului Starter — cu condiția
ca fluxurile de campanie să trimită în lot, nu un workflow per contact. La a doua agenție e nevoie de
`$vars`, care e pe Pro.

**Ce s-a construit:** `scripts/build-n8n.mjs --target=` scoate din aceeași sursă workflow-uri pentru
self-hosted (`$env`), Cloud Pro (`$vars`) și Cloud Starter (marcaje + credențială). Trecerea de la
Starter la Pro e o comandă, nu o rescriere.

**Ce rămâne de verificat cu suportul n8n:** dacă execuțiile de sub-workflow se numără separat în cota
Cloud. Sursele publice se contrazic, iar arhitectura e intenționat bazată pe sub-workflow-uri.

---

### 2. Există sub-cont GHL pentru Dor Travel? Cine emite Private Integration Token-ul și cu ce scopes? ⛔
**De ce contează:** fără sub-cont și token nu se poate rula provisioning-ul, deci nu există custom
fields, tag-uri sau custom values — adică nici segmentare, nici un singur flux funcțional.

**Scopurile necesare** (lista completă e în config, `integrations.ghl.required_pit_scopes`):
`contacts` r/w, `locations/customFields` r/w, `locations/customValues` r/w, `locations/tags` r/w,
`conversations` r/w, `conversations/message` r/w, `opportunities` r/w, `users.readonly`.

**Unde intră răspunsul:** variabilele de mediu `GHL_PIT` și `GHL_LOCATION_ID_DOR_TRAVEL`.

---

### 3. Există cont WhatsApp Business API? Prin ce provider? Dacă nu, cine pornește aprobarea și când? ⛔ pentru 3 fluxuri
**De ce contează:** trei fluxuri sunt exclusiv WhatsApp — „1 zi înainte de plecare", „în timpul
vacanței", „înainte de întoarcere". Aprobarea template-urilor la Meta durează și e dependință externă;
brief-ul cere planificarea ei din prima zi, nu la final.

**Cum e tratat acum:** `integrations.whatsapp.enabled = false`. Garda de trimitere oprește curat pașii
WhatsApp (`reason: channel_unavailable`), fluxurile rulează fără ei și nu eșuează. La activare,
pașii intră în funcțiune fără modificări de workflow.

**De decis odată cu providerul:** cine scrie și trimite spre aprobare cele 3 template-uri, și în ce
limbă/limbi.

**Unde intră răspunsul:** `integrations.whatsapp.{enabled, provider, credential_name_n8n, templates}`.

---

### 4. Ce domeniu se folosește pentru email și e configurat SPF/DKIM/DMARC? ⛔
**De ce contează:** o bază reactivată după luni de tăcere, trimisă de pe un domeniu neautentificat,
ajunge în spam și arde reputația domeniului. Nu se pornește nicio campanie de volum înainte.

**Cum e tratat acum:** `integrations.email.dns_verified = false` — validatorul avertizează la fiecare
rulare.

**Unde intră răspunsul:** `integrations.email.{from_address, reply_to, sending_domain, dns_verified}`.

---

### 5. Ce buget/plan există pe Claude API și pe SMS? ⚠ faza 2
**De ce contează:** configul curent produce **134 de celule de conținut × 2 variante = 268 de texte**
de generat și revizuit. Costul de generare e mic; cel de revizuire umană nu. Pe SMS, plafonul de
3 mesaje comerciale/săptămână × dimensiunea bazei dă costul lunar — dacă e peste buget, se coboară
plafonul din config, nu se rescrie nimic.

**Unde intră răspunsul:** `content.generation.variants_per_cell`,
`sending_rules.frequency_cap.commercial`.

---

## Date existente

### 6. Câte contacte are baza actuală și în ce format vin? ⚠ faza 1
**De ce contează:** determină strategia de import și ritmul de încălzire a domeniului. O bază de
50.000 de contacte nu se trimite într-o zi.

**Unde intră răspunsul:** planul de import (nu e încă în config — se adaugă `import.warmup_schedule`
când știm volumul).

---

### 7. Ce date de preferințe există deja și ce se colectează de la zero? ⚠ faza 1
**De ce contează:** decide dacă fluxul Welcome merge pe „confirmă-ne ce știm despre tine" sau pe
„spune-ne de la zero" — două texte și două rate de răspuns diferite. Determină și câte contacte au
destul profil ca să intre de la început în fluxurile segmentate.

**Unde intră răspunsul:** maparea de import + textele fluxului `welcome`.

---

### 8. Există consimțământ documentat pentru comunicări comerciale? Pe ce canale? ⛔
**De ce contează:** sistemul refuză din construcție să trimită fără consimțământ pe canalul respectiv
(`compliance.consent_required_per_channel = true`). Dacă baza vine fără consimțământ documentat,
**niciun mesaj comercial nu pleacă** până nu se face o campanie de re-permission — și aia trebuie ea
însăși să aibă o bază legală.

Avem nevoie, pentru fiecare contact: canalul, data și sursa consimțământului.

**Unde intră răspunsul:** câmpurile `consim_*` / `consim_*_data` / `consim_*_sursa` la import.

---

### 9. De unde vin datele de rezervare (avans, sold, dată plecare, hotel)? Există ERP integrabil? ⛔ pentru fluxul „înainte de plecare"
**De ce contează:** e cea mai mare dependință nerezolvată. Toată secvența de dinainte de plecare
(35/30/14/7/1 zile) se ancorează în `data_plecare`, iar remiderele de plată în `sold_ramas` și
`data_limita_plata_finala`. Aceste valori nu se generează niciodată — vin din date reale. Dacă intră
manual în GHL, ritmul de introducere devine dependința critică a fluxului, iar un câmp gol înseamnă
mesaj netrimis (prin design: `fallback_strategy: block_send`).

**Unde intră răspunsul:** `booking.source_of_truth`, plus un workflow de sincronizare dacă există ERP.

---

## Business

### 10. Care e mecanismul exact al programului de recomandări (fluxul 13)? ⚠ faza 3
**De ce contează:** brief-ul îl cere obligatoriu, dar nu îl definește. Fără mecanism (ce primește cel
care recomandă, ce primește cel recomandat, cum se urmărește atribuirea) nu există nici flux, nici
tag-uri, nici raportare.

**Cum e tratat acum:** `flows.referral.enabled = false`, cu `blocked_by` care trimite la această întrebare.

**Unde intră răspunsul:** `flows.referral` + eventuale axe noi de taxonomie.

---

### 11. Care e procentul real de avans și termenul de plată finală? ○
**De ce contează:** brief-ul dă „ex. 20%" și 30 de zile — exemple, nu valori confirmate. Ele
determină calendarul întregii secvențe de dinainte de plecare (mementoul la 35 de zile există ca să
anunțe termenul de la 30).

**Cum e tratat acum:** `booking.deposit_percent = 20`, `final_payment_days_before_departure = 30`,
ambele cu `*_confirmed: false`; validatorul avertizează la fiecare rulare. Valorile nu apar niciodată
în text generat — intră doar ca merge fields.

**Unde intră răspunsul:** `booking.*`.

---

### 12. Câți consultanți sunt, cum se alocă și ce se întâmplă când unul e indisponibil? ⛔ pentru task-uri
**De ce contează:** șase evenimente generează task-uri către consultant, iar semnătura fiecărui mesaj
conține numele și contactul lui. Fără listă reală, `{{consultant_name}}` cade pe fallback generic și
task-urile nu au destinatar.

**Cum e tratat acum:** `consultants.assignment_strategy = round_robin`, listă cu un singur element
TBD, realocare după 4h de indisponibilitate.

**Unde intră răspunsul:** `consultants.list[]` (inclusiv `ghl_user_id`), `assignment_strategy`,
`fallback_consultant_id`.

---

### 13. Cine face review-ul de conținut generat și în cât timp? ⚠ faza 2
**De ce contează:** 268 de texte de revizuit, și nimic nu se încarcă în GHL fără aprobare umană
(`content.generation.review_required_before_upload = true`, nenegociabil). Dacă nu există capacitate
de review, se coboară `variants_per_cell` sau se reduce `content_varies_by` — dar decizia e a
clientului, nu a noastră.

**Unde intră răspunsul:** `content.generation.*` + fluxul de aprobare din `content/exports/`.

---

### 14. Ce se întâmplă când un client răspunde „DA" la SMS — cine preia și în cât timp? ⛔ pentru fluxul 4
**De ce contează:** pasul de la 5 zile cere explicit „Răspunde cu DA". Un „DA" fără cineva care îl
preia repede e mai rău decât niciun SMS. E nevoie de: cine primește task-ul, în cât timp, și ce se
întâmplă în afara programului.

**Cum e tratat acum:** `consultant_tasks.create_on` are `sms_reply_yes` cu `due_in_hours: 1`, valoare
de plecare, neconfirmată.

**Unde intră răspunsul:** `consultant_tasks.create_on[]`.

---

## Ce se poate construi fără niciun răspuns

Faza 0 e livrată și nu depinde de nimic din lista de mai sus: configul, schema de date, wrapper-ul de
API, garda de trimitere, formularul și verificările. Toate întrebările de mai sus se materializează în
**valori de config**, nu în cod — de asta a fost construită întâi fundația.

Ce nu poate porni fără răspunsuri: provisioning-ul efectiv în GHL (2), orice trimitere reală (4, 8),
secvența de dinainte de plecare (9), task-urile către consultanți (12, 14).
