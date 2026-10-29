# Globelet — Geography Game

An interactive, map-based geography quiz covering all **198 countries**
(the 193 UN members plus Vatican City, Palestine, Kosovo, Taiwan and the Cook Islands).

## How it plays

1. **Pick what to study** – any mix of:
   - Location – click the country on the world map
   - Capital
   - Flag
   - Country shape
   - Population (rounded to 2 significant figures)
   - System of government
   - Official language
2. **Pick a part of the world** – the whole world, or any mix of 11 regions: Africa,
   Central America & Caribbean, Central Asia, East Asia, Europe, Middle East / West Asia,
   North America, Oceania, South America, South Asia and Southeast Asia.
   The map frames the chosen regions and dims the rest.
3. **Pick how many countries** – 10, 25, 50, 75, 100, 150 or All (only counts that fit
   the chosen regions are offered).
4. For each country the selected questions are asked in this order:
   **shape → location → capital → flag → population → government → language**.
   Shape always comes first because the country's name stays hidden until it's answered.

The world map stays on screen the whole time: you can zoom (scroll / pinch / buttons)
and drag it, tiny countries appear as dots, and after every answer the map flies to
the country. At the end you get a score breakdown per topic, a list of everything
you missed, and a one-click "Retry missed countries" round.

Keyboard: `1`–`4` choose an answer, `Enter` continues.

## Running it

It is a static site with no build step needed. Just open `index.html` in a
browser, or serve the folder:

```sh
npm run serve        # http://localhost:8080
```

## Data

| What | Source |
| --- | --- |
| Borders & shapes | [Natural Earth](https://www.naturalearthdata.com/) via `world-atlas` (1:50m; Tuvalu from 1:10m) |
| Names, capitals, regions | `world-countries` (with a few display tweaks) |
| Flags | `flag-icons` |
| Population, government & official languages | `scripts/country-facts.mjs` (hand-maintained, ≈2025 estimates) |

Generated files (`data/`, `flags/`, `vendor/`) are committed. To regenerate them
after editing `scripts/country-facts.mjs`:

```sh
npm install
npm run build:data
```
