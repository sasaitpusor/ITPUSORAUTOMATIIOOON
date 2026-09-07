# Plan de testare

Două niveluri, cu roluri diferite:

**Automat** (`npm run check`) — logica de decizie: garda de trimitere, randarea merge fields-urilor,
maparea formularului, validarea conținutului generat. Rulează în secunde, nu atinge GHL, prinde
regresiile. 37 de teste, în `scripts/test-runtime.mjs`.

**Manual, end-to-end** — ce nu poate fi testat fără sistemele reale: că GHL chiar acceptă payload-ul,
că emailul chiar ajunge, că merge fields-urile se populează din datele reale ale contactului. Un flux
e „terminat" (secțiunea 19 din brief) doar după ce a trecut end-to-end pe un contact de test, pe
toate canalele pe care le folosește.

## Contacte de test

Se creează în GHL înainte de orice testare, cu tag-ul `ciclu_import` și adrese controlate de echipă.

| # | Profil | De ce există |
|---|---|---|
| T1 | profil complet: toate preferințele, consimțământ pe toate canalele | calea fericită |
| T2 | fără consimțământ pe SMS, cu consimțământ pe email | verifică refuzul pe canal |
| T3 | cu `optout_email` | verifică prioritatea opt-out-ului |
| T4 | rezervare confirmată, `data_plecare` peste 35 de zile | secvența de dinainte de plecare |
| T5 | rezervare cu `sold_ramas` gol | verifică `block_send` pe valori financiare |
| T6 | fără prenume | verifică „Bună, {{prenume}}" gol care nu pleacă niciodată |
| T7 | în vacanță (`flux_in_trip`) | verifică suprimarea comercialelor |
| T8 | cu 3 mesaje comerciale în ultimele 7 zile | verifică plafonul de frecvență |

---

## T0 — Fundație (înainte de orice flux)

| Id | Scenariu | Rezultat așteptat |
|---|---|---|
| T0.1 | `npm run check` | totul verde |
| T0.2 | `npm run provision -- <client> --dry-run` pe sub-cont gol | planul listează toate custom fields-urile și tag-urile; nimic nu e scris |
| T0.3 | `--apply`, apoi `--dry-run` din nou | a doua rulare raportează totul „neschimbat" (idempotență) |
| T0.4 | SW01: `GET /contacts/{id}` pe T1 | 200, tag-uri și custom fields returnate. **Confirmă aici forma exactă a `customFields` la update** (`{key, field_value}` vs `{id, value}`) — diferă între conturi; e singurul loc din sistem unde forma nu e verificată automat |
| T0.5 | SW01 cu token invalid | eroare explicită „PIT invalid sau expirat", nu „request failed" |
| T0.6 | SW01: `POST /contacts/{id}/tags` | tagul apare în GHL — confirmă că wrapper-ul acoperă ce node-ul nativ nu are |
| T0.7 | SW00 cu `client_id` inexistent | eroare clară, nu config gol propagat mai departe |
| T0.8 | Oprește n8n, strică `CONFIG_BASE_URL`, rulează un flux | WF_ERR trimite alertă cu numele workflow-ului și al nodului |
| T0.9 | Formular trimis fără `X-Form-Secret` | respins |

## T-PREF — Formular preferințe (flux „actualizare preferințe")

| Id | Scenariu | Rezultat așteptat |
|---|---|---|
| P1 | contact nou completează formularul | contact creat, custom fields populate, tag-uri de axă aplicate, email de confirmare primit |
| P2 | T1 retrimite formularul cu alt buget | tagul vechi de buget dispare, cel nou apare; contactul nu rămâne în două segmente |
| P3 | T1 șterge o destinație din preferințe | tagul `dest_*` corespunzător dispare |
| P4 | formular parțial (doar buget) | destinațiile rămân neatinse |
| P5 | formular cu o valoare inexistentă | valoarea e ignorată, avertisment în răspuns, restul se salvează |
| P6 | bifă de consimțământ scoasă | `consim_*` devine false, tag de opt-out aplicat, data și sursa scrise |

## T-GUARD — Garda de trimitere (acoperit automat, reconfirmat manual)

| Id | Scenariu | Rezultat așteptat |
|---|---|---|
| G1 | mesaj comercial către T2 pe SMS | nu pleacă, log `no_consent` |
| G2 | mesaj către T3 pe email | nu pleacă, log `opted_out` |
| G3 | același pas rulat de două ori pe T1 | al doilea e `duplicate`, un singur email primit |
| G4 | Early Booking către T7 | suprimat, log `suppressed_by_exclusive_flow` |
| G5 | mesaj tranzacțional către T7 | pleacă — tranzacționalele nu se suprimă |
| G6 | al 4-lea mesaj comercial într-o săptămână către T8 | amânat, `defer_until` calculat |
| G7 | SMS programat la 23:00 ora României | amânat la 09:00 a doua zi |
| G8 | email la 23:00 | pleacă — emailul nu are fereastră orară |
| G9 | pas WhatsApp cu `whatsapp.enabled = false` | sărit curat, log `channel_unavailable`, fluxul continuă |
| G10 | mesaj amânat de 4 ori | se renunță, log `given_up_after_defers` |

## T-RENDER — Merge fields

| Id | Scenariu | Rezultat așteptat |
|---|---|---|
| R1 | email către T1 cu toate variabilele | toate populate, nicio acoladă rămasă, sume în EUR, date în română |
| R2 | email către T5 (sold lipsă) | **nu pleacă**, log `merge_fields_lipsa`, alertă |
| R3 | email către T6 (fără prenume) | pleacă, primul rând e „Bună!" — niciodată „Bună, !" |
| R4 | consultant nealocat | cade pe „Echipa <agenție>" |
| R5 | SMS peste limita de caractere | nu pleacă, log cu lungimea |

## T-FLOW — Per flux (faza 1)

Fiecare flux se testează pe T1, plus pe contactul specific din tabel. Criteriul din secțiunea 19:
*testat end-to-end pe toate canalele pe care le folosește, cu fallback verificat, cu garda respectată,
cu error handling activ, documentat.*

| Flux | Contact | Verificări specifice |
|---|---|---|
| Welcome | T1 | email primit la ~5 min; CTA duce în formular; formularul completat închide bucla |
| Solicitare ofertă | T1 | email + SMS imediat; task creat pe consultantul corect, cu termen |
| Ofertă fără răspuns | T1 | email la 48h; SMS la 5 zile; **răspunsul „DA" oprește fluxul și creează task** |
| Confirmare rezervare | T4 | email de felicitare + email separat de încasare avans; nu se suprapun |
| Înainte de plecare | T4 | 35z email, 30z SMS în ziua exactă, 14z email cu documente, 7z SMS, 1z WhatsApp (când e activ); tagul `flux_pre_departure` blochează comercialele pe toată durata |
| Plată finală întârziată | T5 | email de reamintire blândă doar dacă `sold_ramas > 0` |
| În timpul vacanței | T4 | WhatsApp a doua zi după check-in |
| Înainte de întoarcere | T4 | WhatsApp cu o zi înainte |
| După întoarcere | T4 | email la 24h după revenire; tagul de flux exclusiv e scos, comercialele repornesc |

### Verificări de ieșire, pentru fiecare flux
- [ ] contactul iese din flux când trebuie (răspuns primit, rezervare făcută, opt-out)
- [ ] tagul `flux_*` e scos la ieșire — altfel contactul rămâne suprimat pentru totdeauna
- [ ] o eroare la jumătatea fluxului produce alertă, nu tăcere
- [ ] re-rularea fluxului nu retrimite ce s-a trimis deja

## T-CONTENT — Conținut generat (faza 2)

| Id | Scenariu | Rezultat așteptat |
|---|---|---|
| C1 | text generat care conține un preț | respins automat, nu ajunge la review |
| C2 | text cu „mai sunt 3 locuri" | respins |
| C3 | text cu procent de reducere | respins |
| C4 | SMS generat peste limită | respins |
| C5 | text cu merge field nedeclarat | respins |
| C6 | raportul de categorii pe 30 de zile | 40/20/20/20 ± 5 puncte procentuale, măsurat, nu declarat |

## Ce rămâne netestabil până la răspunsuri

- fluxurile WhatsApp — până la un provider aprobat (întrebarea 3);
- secvența de plată — până se știe de unde vin `sold_ramas` și `data_limita_plata_finala` (întrebarea 9);
- alocarea pe consultanți — până există lista reală (întrebarea 12);
- programul de recomandări — nedefinit (întrebarea 10).
