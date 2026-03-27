# Rope & Resolve

A polished static Hangman game built for easy sharing. It includes:

- A full animated hangman figure on an SVG gallows
- A large English word bank with adaptive difficulty
- Run-based scoring, max score tracking, best streak, and win-rate stats
- A signature solve record for the hardest word guessed in the fewest tries
- Responsive keyboard controls and an on-screen keyboard for mobile

## Run locally

```bash
python3 main.py
```

Then open `http://127.0.0.1:8000`.

## Controls

- `A-Z` guess letters
- `Enter` continue after a win or restart after a loss
- `R` restart the run any time

## Files

- `index.html` contains the game layout
- `styles.css` contains the visual system and animations
- `game.js` contains the game logic, scoring, persistence, and UI updates
- `words.txt` contains the large word bank loaded by the browser
- `main.py` serves the project locally with Python

## Free hosting

This project is a pure static site, so it can be hosted on free static platforms without a build step. Upload the project root as-is to a static host like Netlify, Cloudflare Pages, Vercel, or GitHub Pages.
