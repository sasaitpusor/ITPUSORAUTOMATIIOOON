# Configurația clientului

Un client = un fișier în `clients/`. Nimic specific unui client nu are voie să existe în altă parte.

## Cum se citește un config

| Secțiune | Ce controlează |
|---|---|
| `client` | identitate, fus orar (baza ferestrelor orare), monedă (formatarea sumelor) |
| `brand_voice` | tonul, ce nu spune brandul, semnătura — intră în prompturile de generare |
| `integrations` | unde sunt API-urile și **numele** credențialelor/variabilelor. Niciodată valorile |
| `taxonomy.axes` | axele de segmentare. Sursa unică pentru tag-uri, opțiuni de câmp și câmpurile din formular |
| `custom_fields` | câmpurile din GHL. Cele cu `axis` își iau opțiunile din axă, nu se dublează |
| `booking` | procent avans, termen de plată. Doar merge fields, niciodată text generat |
| `consultants` | lista reală, strategia de alocare, ce se face la indisponibilitate |
| `sending_rules` | ferestre orare, plafon de frecvență, suprimare între fluxuri, idempotență |
| `compliance` | consimțământ pe canal, opt-out, dezabonare, interdicția de PII către Claude |
| `content` | raportul 40/20/20/20, ce nu are voie să genereze modelul, limitele de canal |
| `merge_fields` | ce se întâmplă când o valoare lipsește — inclusiv „nu trimite deloc" |
| `flows` | trigger, pași, offset-uri, canale, segmentare. **Aici se schimbă timing-ul unui flux, nu în n8n** |

## Reguli

**Opțiunile se scriu o singură dată.** Un câmp cu `axis: "destination"` își ia opțiunile din
`taxonomy.axes.destination.values`. O destinație nouă se adaugă într-un singur loc și apare automat în
tag-uri, în câmpul GHL și în formular.

**`segmented_by` ≠ `content_varies_by`.** Primul spune cine primește mesajul (filtru de audiență, exact
cum cere brief-ul). Al doilea spune pe ce axe se scrie text diferit. Fără distincția asta, cele 5 axe
cerute pentru ofertele personalizate ar produce peste 10.000 de texte de revizuit uman.

**Niciun secret.** Configul ține doar nume de variabile de mediu și de credențiale. Validatorul caută
tipare de token și pică dacă găsește ceva.

## Verificare

```bash
npm run validate -- <client-id>
```

Verifică schema, integritatea taxonomie ↔ câmpuri, coliziunile de tag-uri, acoperirea consimțămintelor
pe canalele folosite, coerența fluxurilor și a regulilor de suprimare, suma raportului de conținut, și
raportează ce a rămas necompletat.
