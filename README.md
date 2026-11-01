# Fueling-Rechner

Ein Rechner für die Kohlenhydratzufuhr (g/h) während Training und Wettkampf. Er basiert auf dem Modell aus

> Morton JP, Fell JM, Gonzalez JT, Hearris MA, Podlogar T, Pugh JN, Wallis GA.
> *From Metabolism to Medals: Contemporary Perspectives and Revisiting Carbohydrate Guidelines for Fueling Endurance Athletes during Exercise.*
> The Journal of Nutrition 156 (2026) 101442. https://doi.org/10.1016/j.tjnut.2026.101442

sowie auf den darin zitierten Studien. Der Rechner ist eine reine statische Webseite (HTML, CSS, JavaScript) ohne Build-Schritt, ohne Abhängigkeiten und ohne Tracking.

## Funktionen

- Empfehlung in g/h samt Bereich laut Modell (Intensität × Dauer, Abb. 5 im Paper)
- Aufteilung in Glukose/Maltodextrin und Fruktose (Verhältnis 1 : 0,8 ab > 60 g/h)
- Gesamtmenge für die Einheit
- Zusätzlich Sprint- und Krafttraining (abgeleitet aus weiteren Meta-Analysen, siehe unten)
- Hinweise je nach Sportart, Umgebung (Hitze, Kälte, Höhe), Körpergewicht und Geschlecht
- Vergleich mit den ACSM-Empfehlungen von 2016
- Hell- und Dunkelmodus, funktioniert auf dem Smartphone

## Nutzung

Lokal: `index.html` im Browser öffnen.

### Mit GitHub Pages veröffentlichen

1. Neues Repository auf GitHub anlegen, z. B. `fueling-rechner`.
2. Die Dateien dieses Ordners hochladen (oder per Git pushen):
   ```bash
   git init
   git add .
   git commit -m "Fueling-Rechner"
   git branch -M main
   git remote add origin https://github.com/<DEIN-NAME>/fueling-rechner.git
   git push -u origin main
   ```
3. Im Repository unter **Settings → Pages** bei *Source* „Deploy from a branch“ wählen, Branch `main`, Ordner `/ (root)`, speichern.
4. Nach ein bis zwei Minuten ist der Rechner unter `https://<DEIN-NAME>.github.io/fueling-rechner/` erreichbar.

## Berechnungslogik

**1. Grundbereich** aus dem Modell (Morton et al. 2026, Abb. 5), in g/h:

| Zone | < 1 h | 1–2 h | 2–3 h | 3–6 h | > 6 h |
|---|---|---|---|---|---|
| Z5 VO₂max / HIT | 30–60 | 75–90 | 90–120 | 90–120 | 90–120 |
| Z4 Schwelle | 0–30 | 75–90 | 90–120 | 90–120 | 90–120 |
| Z3 Tempo | 0–30 | 60–90 | 90–120 | 90–120 | 90–120 |
| Z2 Grundlage | 0 | 30–60 | 60–90 | 60–90 | 60–90 |
| Z1 Regeneration | 0 | 0–30 | 30–60 | 30–60 | 60–90 |

Die Feldgrenzen sind in der Originalabbildung nur grob gezeichnet. Die Tabelle ist eine Übersetzung in feste Stundenbereiche.

**2. Position im Bereich** (Start 50 %):
- Wettkampf / Schlüsseleinheit: +30 %
- Körpergewicht < 70 kg: −15 %, ≥ 80 kg: +10 % (Ijaz et al. 2025)
- Laufen: −10 % (höheres GI-Risiko)
- Hitze: −10 % (exogene Oxidation −20–30 %)
- Train-low bei Z1–Z2: Untergrenze des Bereichs

Das Ergebnis wird auf 5 g gerundet.

**3. Deckelung** durch die bisher vertragene Menge (60 / 90 / 120 g/h).

**4. Zusammensetzung:** bis 60 g/h Glukose/Maltodextrin, darüber Glukose : Fruktose = 1 : 0,8.

**Sprint** (nicht Teil des Papers), g/h:

| Form | < 1 h | 1–2 h | > 2 h |
|---|---|---|---|
| Wiederholte Sprints, kurze Pausen | 0–30 | 30–60 | 60–90 |
| Maximalsprints, lange Pausen | 0 | 0 | 0–30 |

Einzelne Maximalsprints sind nicht durch Kohlenhydrate limitiert; eine KH-Mundspülung zeigte in einer Meta-Analyse keinen Effekt auf die Sprintleistung. Wiederholte Sprints werden ab ~60 min wie intermittierender Teamsport behandelt.

**Krafttraining** (nicht Teil des Papers), g/h:

| Umfang | < 45 min | 45–90 min | > 90 min |
|---|---|---|---|
| Hoch oder nüchtern (≥ 8 h) | 0–20 | 20–40 | 30–60 |
| Normal | 0 | 0–30 | 20–40 |

Grundlage: King et al. 2022 (21 Studien). KH steigerten das Trainingsvolumen, vor allem bei Einheiten > 45 min, nach ≥ 8 h Fasten und mit vielen Sätzen bis zur Ausbelastung; die Dosis hatte keinen Einfluss.

Die gesamte Logik steht in `app.js` in der Funktion `compute()`; die Modelltabelle ist das Objekt `M`.

## Einschränkungen

- Kein medizinischer Rat.
- Die absoluten Oxidationsraten im Modell stammen fast ausschließlich aus Studien mit Männern.
- Zufuhren über 120 g/h sind wissenschaftlich nicht belegt und werden nicht ausgegeben.
- Neue Mengen und Produkte immer zuerst im Training testen.

## Quellen

1. Morton JP et al. J Nutr 2026;156:101442.
2. Thomas DT, Erdman KA, Burke LM. ACSM Joint Position Statement: Nutrition and Athletic Performance. Med Sci Sports Exerc 2016;48:543–568.
3. Hearris MA et al. J Appl Physiol 2022;132:1394–1406.
4. Podlogar T et al. Eur J Appl Physiol 2022;122:2393–2401.
5. O'Brien WJ, Rowlands DS. Am J Physiol 2011; O'Brien WJ et al. Med Sci Sports Exerc 2013.
6. Ijaz A et al. Int J Sport Nutr Exerc Metab 2025;35:12–23.
7. Ravikanti S et al. J Appl Physiol 2025.
8. Viribay A et al. Nutrients 2020;12:1367.
9. King A, Helms E, Zinn C, Jukic I. The Ergogenic Effects of Acute Carbohydrate Feeding on Resistance Exercise Performance: A Systematic Review and Meta-analysis. Sports Med 2022.
10. Systematische Übersicht und Meta-Analyse: Influence of carbohydrate mouth rinse on sprint performance (UNESP).

## Lizenz

Code unter MIT-Lizenz (siehe `LICENSE`). Das zugrunde liegende Paper ist unter CC BY 4.0 veröffentlicht.
