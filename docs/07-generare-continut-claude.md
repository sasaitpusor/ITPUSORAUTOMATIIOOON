# Generarea de conținut cu Claude API

## Regula de bază

Conținutul se **pre-generează în batch și se revizuiește o dată de un om**, nu se generează live la
fiecare trimitere.

Motivul e concret: variabilele financiare și de dată — avans achitat, sold rămas, termen de plată,
dată de plecare — nu au voie să fie generate niciodată. Ele vin exclusiv din merge fields alimentate
din GHL. Claude scrie textul din jurul lor: partea de inspirație, educație și încredere.

Generarea live ar însemna un model care produce, în fața clientului, o propoziție care conține o
cifră. Chiar cu instrucțiuni bune, riscul nu merită asumat pentru o problemă care se rezolvă prin
pre-generare.

## Ce e interzis în textul generat

Prețuri concrete · procente de reducere · disponibilități („mai sunt 3 locuri") · nume de hoteluri ·
date de plecare · termene de plată.

Interdicția e aplicată automat de `n8n/runtime/content.mjs`, pe tiparele din
`content.forbidden_in_generated.patterns`. Un text care le încalcă e respins **înainte** de review,
ca omul să nu fie pus în situația de a valida o cifră inventată care arată plauzibil. Tokenii de
merge field sunt scoși înainte de verificare, ca `{{sold_ramas}}` să nu fie confundat cu o sumă.

## Fluxul

```
config client
   │
   ├─► celule de generat = flux × content_varies_by × canal
   │      (134 celule × 2 variante = 268 texte pentru configul curent)
   │
   ├─► prompt: brief + ghid de brand din config, cu PLACEHOLDERE, fără date reale de client
   │
   ├─► Claude API, în batch
   │
   ├─► validare automată ─► respins ─► regenerare
   │
   ├─► export CSV pentru review uman
   │      coloane: flux · segment · canal · categorie · subiect · text · status · observații
   │
   ├─► aprobare umană (obligatorie, neocolibilă)
   │
   └─► încărcare ca template-uri în GHL, cu merge fields
```

## Audiență vs. text: de ce nu sunt 10.000 de variante

Brief-ul cere segmentare pe destinație + buget + tip turist + perioadă + oraș de plecare. Aplicat
direct la generarea de text, asta înseamnă 8 × 4 × 5 × 6 × 11 = **10.560 de texte** doar pentru
ofertele personalizate. Nimeni nu revizuiește asta, deci în practică ar însemna conținut nerevizuit
în producție.

Distincția din config rezolvă problema:
- **`segmented_by`** — cine primește mesajul. Filtru de audiență, se aplică la selecția contactelor.
  Rămâne exact cum cere brief-ul.
- **`content_varies_by`** — pe ce axe se scrie text diferit. Subset restrâns, de obicei destinația și,
  pentru ofertele de sezon, tipul de turist.

Segmentarea comercială e integrală. Doar numărul de texte de scris e ținut la un nivel la care
revizuirea umană chiar se poate face.

## Date personale în prompturi

Nu se trimit. Prompturile conțin placeholdere (`{{prenume}}`, `{{destinatie_rezervata}}`), niciodată
valori reale de contact. Modelul scrie șabloane, nu mesaje pentru o persoană anume — ceea ce e și
corect din perspectiva conformității, și necesar pentru pre-generare.

## Prompt de sistem (structură)

Se construiește din config, nu se scrie de mână per client:

1. **Cine e agenția** — `client.business_model`, `brand_voice.positioning_statement`. Aici intră
   distincția care schimbă tot tonul: nu e un catalog de hoteluri, e un serviciu de consultanță.
2. **Cum vorbește** — `brand_voice.tone`, `brand_voice.person`, `brand_voice.avoid`.
3. **Ce se scrie acum** — fluxul, pasul, canalul, categoria de conținut, segmentul.
4. **Ce e interzis** — lista de mai sus, explicit, plus lista de merge fields disponibile.
5. **Constrângeri de canal** — lungime pentru SMS, subiect obligatoriu pentru email.

## Review

Exportul ajunge în `content/exports/` ca CSV, cu o coloană `status` (`nou` / `aprobat` / `respins`) și
una de observații. Doar liniile `aprobat` se încarcă în GHL.

Cine face review-ul și în cât timp e întrebarea 13 din `02-intrebari-deschise.md` — deocamdată fără
răspuns, și e o dependință reală: 268 de texte nu se revizuiesc într-o după-amiază.

## Model

`integrations.claude.batch_model` pentru volumul de generare, `integrations.claude.model` pentru
piesele care cer cel mai bun rezultat. Ambele în config, schimbabile fără atins workflow-ul.

> Statusul acestui workflow: **faza 2, neconstruit**. Validatorul de conținut și calculul celulelor
> există deja și sunt acoperite de teste (`npm test`) — ele sunt partea care trebuie să fie corectă
> înainte ca generarea să aibă voie să pornească.
