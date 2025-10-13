# Hardlooptijden App 🏃‍♂️

Een simpele app om je hardlooptijden en afstanden bij te houden.  
Handig om inzicht te krijgen in je voortgang en persoonlijke records.

## 🚀 Features
- Runs toevoegen met datum, afstand, tijd én hartslag (gemiddeld verplicht, maximaal optioneel)
- Automatische berekening van tempo met waarschuwingen bij onrealistische waarden
- Lijngrafieken voor hartslag (laatste 12 weken en alle runs) via Chart.js
- KPI-dashboard met meters voor afstand en tempo plus hartslag- en herstelindicatoren
- Startpagina met hero-statistieken en directe snelkoppelingen naar logboek en KPI&apos;s
- Instellingenpagina voor doelen, streeftempo, maximale hartslag en JSON-/CSV-export

## 📁 Mappenstructuur
- `assets/css/styles.css` — hoofdstylesheet voor de lichte Running Smart-stijl.
- `assets/js/main.js` — startpunt (ES modules) dat context, views en dashboards initialiseert.
- `assets/js/ui/` — UI-modules voor navigatie, dashboard, runs en instellingen.
- `assets/js/data/` — opslag, standaardwaarden en statistiekberekeningen.
- `assets/js/utils/` — hulpfuncties voor parsing, formatting en helpers.

## 💡 Verdere UI-ideeën
- Maak de navigatie mobielvriendelijk met een uitschuifmenu zodat knoppen niet stapelen.
- Voorzie een licht/donker schakelaar zodat gebruikers niet afhankelijk zijn van het systeemthema.
- Voeg micro-animaties toe (bijvoorbeeld bij het laden van KPI-kaarten) voor extra feedback tijdens het wisselen van schermen.
