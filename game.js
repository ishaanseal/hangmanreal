const STORAGE_KEY = "rope-and-resolve-stats-v1";
const MAX_MISTAKES = 6;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const PART_ORDER = [
  "part-head",
  "part-body",
  "part-arm-left",
  "part-arm-right",
  "part-leg-left",
  "part-leg-right",
];
const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);
const RARE_LETTERS = new Set(["j", "q", "x", "z", "v", "k"]);
const BLOCKED_WORDS = new Set([
  "arse",
  "asshole",
  "bastard",
  "bitch",
  "boner",
  "boobies",
  "boobs",
  "cock",
  "condom",
  "condoms",
  "crotch",
  "cunt",
  "dildo",
  "dicks",
  "douche",
  "fucks",
  "gonorrhea",
  "horny",
  "nipple",
  "nipples",
  "orgasm",
  "ovary",
  "panties",
  "penis",
  "pissy",
  "prick",
  "pussy",
  "semen",
  "shits",
  "sluts",
  "sperm",
  "titty",
  "twats",
  "uterus",
  "vagina",
  "vulva",
  "whore",
]);
const FALLBACK_WORDS = [
  "anchor",
  "anthem",
  "apricot",
  "aurora",
  "backpack",
  "balloon",
  "beacon",
  "butter",
  "cabinet",
  "canyon",
  "captain",
  "cascade",
  "charcoal",
  "cinder",
  "compass",
  "crimson",
  "daylight",
  "domino",
  "emerald",
  "feather",
  "festival",
  "firefly",
  "galaxy",
  "glacier",
  "harbor",
  "harmony",
  "iceberg",
  "journal",
  "lantern",
  "library",
  "marble",
  "melody",
  "midnight",
  "monsoon",
  "nebula",
  "orchard",
  "orbit",
  "paradox",
  "pebble",
  "phoenix",
  "pioneer",
  "planet",
  "prairie",
  "ribbon",
  "rocket",
  "saffron",
  "silhouette",
  "solstice",
  "starlight",
  "sunrise",
  "tempest",
  "tornado",
  "trident",
  "venture",
  "voyager",
  "whisper",
  "wildfire",
  "zeppelin",
];

const ui = {
  bankSize: document.getElementById("bankSize"),
  bestScoreValue: document.getElementById("bestScoreValue"),
  bestStreakValue: document.getElementById("bestStreakValue"),
  statusTitle: document.getElementById("statusTitle"),
  difficultyBadge: document.getElementById("difficultyBadge"),
  roundBadge: document.getElementById("roundBadge"),
  gallowsStage: document.getElementById("gallowsStage"),
  banner: document.getElementById("statusBanner"),
  bannerEyebrow: document.getElementById("bannerEyebrow"),
  bannerTitle: document.getElementById("bannerTitle"),
  bannerText: document.getElementById("bannerText"),
  primaryAction: document.getElementById("primaryAction"),
  secondaryAction: document.getElementById("secondaryAction"),
  mistakesValue: document.getElementById("mistakesValue"),
  missedLetters: document.getElementById("missedLetters"),
  uniqueLettersValue: document.getElementById("uniqueLettersValue"),
  scoreValue: document.getElementById("scoreValue"),
  streakValue: document.getElementById("streakValue"),
  roundPointsValue: document.getElementById("roundPointsValue"),
  wordSlots: document.getElementById("wordSlots"),
  wordLengthValue: document.getElementById("wordLengthValue"),
  guessCountValue: document.getElementById("guessCountValue"),
  accuracyValue: document.getElementById("accuracyValue"),
  keyboard: document.getElementById("keyboard"),
  nextWordButton: document.getElementById("nextWordButton"),
  restartButton: document.getElementById("restartButton"),
  winsValue: document.getElementById("winsValue"),
  lossesValue: document.getElementById("lossesValue"),
  winRateValue: document.getElementById("winRateValue"),
  perfectRoundsValue: document.getElementById("perfectRoundsValue"),
  signatureWord: document.getElementById("signatureWord"),
  signatureDescription: document.getElementById("signatureDescription"),
  signatureDifficulty: document.getElementById("signatureDifficulty"),
  signatureGuesses: document.getElementById("signatureGuesses"),
  historyList: document.getElementById("historyList"),
  announcer: document.getElementById("announcer"),
};

const stats = loadStats();
const state = {
  bankReady: false,
  bank: [],
  pools: {},
  currentWord: "",
  currentEntry: null,
  guessedLetters: new Set(),
  wrongLetters: [],
  usedWords: new Set(),
  round: 1,
  streak: 0,
  score: 0,
  roundPoints: 0,
  roundStartedAt: 0,
  status: "loading",
  history: [],
  timers: {
    shake: null,
    celebrate: null,
  },
};

const bannerActions = {
  primary: null,
  secondary: null,
};

init();

async function init() {
  buildKeyboard();
  bindEvents();
  renderPersistentStats();
  renderHistory();
  setBanner({
    visible: true,
    eyebrow: "Please wait",
    title: "Stocking the word vault...",
    text: "Loading a giant English word bank and tuning the difficulty curve.",
    primaryLabel: "Loading...",
    primaryDisabled: true,
  });

  try {
    await loadWordBank();
    state.bankReady = true;
    startNewRun();
  } catch (error) {
    console.error(error);
    setBanner({
      visible: true,
      eyebrow: "Something broke",
      title: "The word bank did not load",
      text: "Refresh the page or restart the run to try again.",
      primaryLabel: "Restart run",
      primaryAction: startNewRun,
    });
    ui.statusTitle.textContent = "Word bank unavailable";
  }
}

function bindEvents() {
  ui.primaryAction.addEventListener("click", () => {
    bannerActions.primary?.();
  });

  ui.secondaryAction.addEventListener("click", () => {
    bannerActions.secondary?.();
  });

  ui.restartButton.addEventListener("click", () => {
    if (!state.bankReady) {
      return;
    }

    startNewRun();
  });

  ui.nextWordButton.addEventListener("click", () => {
    if (state.status === "won") {
      advanceToNextRound();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (!state.bankReady) {
      return;
    }

    const key = event.key.toUpperCase();

    if (key === "R") {
      event.preventDefault();
      startNewRun();
      return;
    }

    if (key === "ENTER") {
      if (state.status === "won") {
        event.preventDefault();
        advanceToNextRound();
      } else if (state.status === "lost") {
        event.preventDefault();
        startNewRun();
      }
      return;
    }

    if (!/^[A-Z]$/.test(key)) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }

    event.preventDefault();
    handleGuess(key);
  });

  window.addEventListener("resize", fitWordSlots);
}

function buildKeyboard() {
  const fragment = document.createDocumentFragment();

  ALPHABET.forEach((letter) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "key-button";
    button.dataset.letter = letter;
    button.dataset.state = "idle";
    button.textContent = letter;
    button.disabled = true;
    button.addEventListener("click", () => handleGuess(letter));
    fragment.append(button);
  });

  ui.keyboard.append(fragment);
}

async function loadWordBank() {
  let sourceWords = FALLBACK_WORDS;

  try {
    const response = await fetch("words.txt", { cache: "force-cache" });

    if (!response.ok) {
      throw new Error(`Failed to load words.txt (${response.status})`);
    }

    const text = await response.text();
    sourceWords = text.split(/\r?\n/);
  } catch (error) {
    console.warn("Falling back to embedded word list.", error);
  }

  const seen = new Set();
  const cleanedWords = [];

  for (const rawWord of sourceWords) {
    const word = normalizeWord(rawWord);

    if (!word || seen.has(word) || BLOCKED_WORDS.has(word)) {
      continue;
    }

    seen.add(word);
    cleanedWords.push(word);
  }

  const entries = cleanedWords.map((word, index) => {
    return buildWordEntry(word, index, cleanedWords.length);
  });

  if (!entries.length) {
    throw new Error("No playable words were available.");
  }

  state.bank = entries;
  state.pools = buildPools(entries);
  ui.bankSize.textContent = `${entries.length.toLocaleString()} words`;
}

function normalizeWord(rawWord) {
  const word = String(rawWord || "").trim().toLowerCase();

  if (!/^[a-z]{4,11}$/.test(word)) {
    return "";
  }

  return word;
}

function buildWordEntry(word, rank, totalWords) {
  const letters = word.split("");
  const uniqueLetters = [...new Set(letters)];
  const vowelCount = letters.filter((letter) => VOWELS.has(letter)).length;
  const duplicateCount = word.length - uniqueLetters.length;
  const rareCount = uniqueLetters.filter((letter) => RARE_LETTERS.has(letter)).length;
  const vowelRatio = vowelCount / word.length;
  const rarity = rank / Math.max(1, totalWords - 1);

  const difficulty = Math.round(
    word.length * 5 +
      uniqueLetters.length * 3 +
      rareCount * 9 +
      duplicateCount * 2 +
      Math.abs(0.42 - vowelRatio) * 16 +
      rarity * 40
  );

  return {
    word,
    rank,
    difficulty,
    uniqueCount: uniqueLetters.length,
    length: word.length,
  };
}

function buildPools(entries) {
  const sortedByDifficulty = [...entries].sort((left, right) => {
    if (left.difficulty !== right.difficulty) {
      return left.difficulty - right.difficulty;
    }

    return left.rank - right.rank;
  });

  const tiers = [
    { key: "breeze", from: 0, to: 0.28 },
    { key: "steady", from: 0.28, to: 0.58 },
    { key: "storm", from: 0.58, to: 0.83 },
    { key: "legend", from: 0.83, to: 1 },
  ];

  return tiers.reduce((pools, tier) => {
    const start = Math.floor(sortedByDifficulty.length * tier.from);
    const end = Math.max(start + 1, Math.floor(sortedByDifficulty.length * tier.to));
    pools[tier.key] = sortedByDifficulty.slice(start, end).sort((left, right) => {
      if (left.rank !== right.rank) {
        return left.rank - right.rank;
      }

      return left.word.localeCompare(right.word);
    });
    return pools;
  }, {});
}

function startNewRun() {
  state.score = 0;
  state.streak = 0;
  state.round = 1;
  state.roundPoints = 0;
  state.usedWords = new Set();
  state.history = [];
  renderHistory();
  beginRound();
}

function advanceToNextRound() {
  state.round += 1;
  state.roundPoints = 0;
  beginRound();
}

function beginRound() {
  if (!state.bankReady) {
    return;
  }

  const entry = pickWordForRound();

  state.currentEntry = entry;
  state.currentWord = entry.word.toUpperCase();
  state.guessedLetters = new Set();
  state.wrongLetters = [];
  state.status = "playing";
  state.roundStartedAt = performance.now();
  state.usedWords.add(entry.word);
  ui.gallowsStage.classList.remove("is-shaking", "is-celebrating");

  hideBanner();
  renderRound();
  announce(`Round ${state.round}. ${entry.length} letter word ready.`);
}

function pickWordForRound() {
  const pressure = state.round + Math.floor(state.streak / 2);
  const roll = Math.random();
  let poolKey = "breeze";

  if (pressure <= 2) {
    poolKey = roll < 0.78 ? "breeze" : "steady";
  } else if (pressure <= 5) {
    poolKey = roll < 0.18 ? "breeze" : roll < 0.84 ? "steady" : "storm";
  } else if (pressure <= 8) {
    poolKey = roll < 0.18 ? "steady" : roll < 0.82 ? "storm" : "legend";
  } else {
    poolKey = roll < 0.34 ? "storm" : "legend";
  }

  const pool = state.pools[poolKey] || state.bank;
  const variety = Math.min(1, 0.18 + (state.round - 1) * 0.08 + state.streak * 0.03);
  const searchWindow = Math.min(
    pool.length,
    Math.max(120, Math.floor(pool.length * variety))
  );

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const candidate = pool[Math.floor(Math.random() * searchWindow)];

    if (candidate && !state.usedWords.has(candidate.word)) {
      return candidate;
    }
  }

  return (
    pool.find((candidate) => !state.usedWords.has(candidate.word)) ||
    pool[Math.floor(Math.random() * pool.length)] ||
    state.bank[Math.floor(Math.random() * state.bank.length)]
  );
}

function handleGuess(letter) {
  if (state.status !== "playing" || state.guessedLetters.has(letter)) {
    return;
  }

  state.guessedLetters.add(letter);

  if (state.currentWord.includes(letter)) {
    renderRound();

    if (isWordSolved()) {
      finishRound(true);
    } else {
      announce(`${letter} is in the word.`);
    }

    return;
  }

  state.wrongLetters.push(letter);
  triggerStageShake();
  renderRound();
  announce(`${letter} is not in the word.`);

  if (state.wrongLetters.length >= MAX_MISTAKES) {
    finishRound(false);
  }
}

function isWordSolved() {
  return [...state.currentWord].every(
    (letter) => state.guessedLetters.has(letter)
  );
}

function finishRound(didWin) {
  const elapsedSeconds = Math.max(
    1,
    Math.round((performance.now() - state.roundStartedAt) / 1000)
  );
  const wordLabel = state.currentWord;
  const guesses = state.guessedLetters.size;

  if (didWin) {
    const roundScore = calculateRoundScore(elapsedSeconds);
    state.roundPoints = roundScore;
    state.score += roundScore;
    state.streak += 1;
    state.status = "won";

    stats.wins += 1;
    stats.perfectRounds += state.wrongLetters.length === 0 ? 1 : 0;
    stats.highScore = Math.max(stats.highScore, state.score);
    stats.bestStreak = Math.max(stats.bestStreak, state.streak);

    const signatureCandidate = {
      word: wordLabel,
      difficulty: state.currentEntry.difficulty,
      guesses,
      misses: state.wrongLetters.length,
      roundScore,
    };

    if (isBetterSignature(signatureCandidate, stats.signatureSolve)) {
      stats.signatureSolve = signatureCandidate;
    }

    saveStats();
    triggerStageCelebrate();
    addHistoryEntry({
      type: "win",
      title: `Solved ${wordLabel}`,
      detail: `${getDifficultyLabel(state.currentEntry.difficulty)} · ${guesses} guesses · +${roundScore.toLocaleString()}`,
    });

    setBanner({
      visible: true,
      eyebrow: "Round cleared",
      title: `${wordLabel} cracked`,
      text: `You earned ${roundScore.toLocaleString()} points in ${elapsedSeconds}s with ${MAX_MISTAKES - state.wrongLetters.length} lives still hanging on.`,
      primaryLabel: "Next word",
      primaryAction: advanceToNextRound,
      secondaryLabel: "Restart run",
      secondaryAction: startNewRun,
    });

    announce(`Solved ${wordLabel} for ${roundScore} points.`);
  } else {
    state.status = "lost";
    state.roundPoints = 0;
    stats.losses += 1;
    saveStats();

    addHistoryEntry({
      type: "loss",
      title: `Dropped on ${wordLabel}`,
      detail: `${getDifficultyLabel(state.currentEntry.difficulty)} · round ${state.round} · final ${state.score.toLocaleString()}`,
    });

    setBanner({
      visible: true,
      eyebrow: "Run over",
      title: `The word was ${wordLabel}`,
      text: `Your run ended on round ${state.round} with ${state.score.toLocaleString()} points. Restart and chase a bigger max score.`,
      primaryLabel: "Restart run",
      primaryAction: startNewRun,
    });

    announce(`Run over. The word was ${wordLabel}.`);
  }

  renderPersistentStats();
  renderRound();
}

function calculateRoundScore(elapsedSeconds) {
  const difficultyBonus = state.currentEntry.difficulty * 5;
  const survivalBonus = (MAX_MISTAKES - state.wrongLetters.length) * 42;
  const speedBonus = Math.max(30, 160 - elapsedSeconds * 4);
  const precisionBonus = Math.max(20, 110 - state.wrongLetters.length * 18);

  return Math.round(120 + difficultyBonus + survivalBonus + speedBonus + precisionBonus);
}

function isBetterSignature(candidate, current) {
  if (!current) {
    return true;
  }

  if (candidate.difficulty !== current.difficulty) {
    return candidate.difficulty > current.difficulty;
  }

  if (candidate.guesses !== current.guesses) {
    return candidate.guesses < current.guesses;
  }

  if (candidate.misses !== current.misses) {
    return candidate.misses < current.misses;
  }

  return candidate.roundScore > current.roundScore;
}

function renderRound() {
  const wordLength = state.currentEntry?.length || 0;
  const guessCount = state.guessedLetters.size;
  const correctCount = guessCount - state.wrongLetters.length;
  const accuracy =
    guessCount === 0 ? 100 : Math.round((correctCount / guessCount) * 100);

  ui.statusTitle.textContent = getStatusTitle();
  ui.difficultyBadge.textContent = state.currentEntry
    ? getDifficultyLabel(state.currentEntry.difficulty)
    : "Adaptive";
  ui.roundBadge.textContent = `Round ${state.round}`;
  ui.mistakesValue.textContent = `${state.wrongLetters.length} / ${MAX_MISTAKES}`;
  ui.missedLetters.textContent =
    state.wrongLetters.length > 0 ? state.wrongLetters.join(" · ") : "None";
  ui.uniqueLettersValue.textContent = String(state.currentEntry?.uniqueCount || 0);
  ui.scoreValue.textContent = state.score.toLocaleString();
  ui.streakValue.textContent = state.streak.toLocaleString();
  ui.roundPointsValue.textContent = state.roundPoints.toLocaleString();
  ui.wordLengthValue.textContent = `Length ${wordLength}`;
  ui.guessCountValue.textContent = `Guesses ${guessCount}`;
  ui.accuracyValue.textContent = `Accuracy ${accuracy}%`;
  ui.nextWordButton.disabled = state.status !== "won";

  renderWordSlots();
  renderKeyboard();
  renderHangman();
}

function getStatusTitle() {
  if (state.status === "won") {
    return "You cracked it";
  }

  if (state.status === "lost") {
    return "The rope snapped";
  }

  return "Guess the hidden word";
}

function renderWordSlots() {
  ui.wordSlots.innerHTML = "";

  if (!state.currentWord) {
    return;
  }

  const fragment = document.createDocumentFragment();

  state.currentWord.split("").forEach((letter) => {
    const slot = document.createElement("span");
    const showLetter =
      state.guessedLetters.has(letter) || state.status === "lost";

    slot.className = "word-slot";

    if (showLetter) {
      slot.classList.add(state.status === "lost" ? "is-revealed" : "is-open");
    }

    const letterNode = document.createElement("span");
    letterNode.className = "word-slot__letter";
    letterNode.textContent = showLetter ? letter : "";

    slot.append(letterNode);
    fragment.append(slot);
  });

  ui.wordSlots.append(fragment);
  fitWordSlots();
}

function fitWordSlots() {
  if (!state.currentWord) {
    return;
  }

  const letterCount = state.currentWord.length;
  const availableWidth =
    ui.wordSlots.clientWidth || ui.wordSlots.parentElement?.clientWidth || 0;

  if (!availableWidth) {
    return;
  }

  const preferredGap =
    letterCount <= 6 ? 12 : letterCount <= 8 ? 10 : letterCount <= 10 ? 8 : 6;
  let gap = preferredGap;
  let size = 62;

  for (let nextGap = preferredGap; nextGap >= 2; nextGap -= 1) {
    const nextSize = Math.floor(
      (availableWidth - nextGap * (letterCount - 1)) / letterCount
    );

    gap = nextGap;
    size = nextSize;

    if (nextSize >= 24) {
      break;
    }
  }

  size = Math.max(12, Math.min(62, size));

  const height = Math.max(18, Math.round(size * 1.18));
  const radius = Math.max(8, Math.round(size * 0.28));
  const fontSize = Math.max(11, Math.round(size * 0.52));
  const paddingY = Math.max(2, Math.round(size * 0.12));
  const paddingX = Math.max(2, Math.round(size * 0.08));

  ui.wordSlots.style.setProperty("--slot-gap", `${gap}px`);
  ui.wordSlots.style.setProperty("--slot-size", `${size}px`);
  ui.wordSlots.style.setProperty("--slot-height", `${height}px`);
  ui.wordSlots.style.setProperty("--slot-radius", `${radius}px`);
  ui.wordSlots.style.setProperty("--slot-font-size", `${fontSize}px`);
  ui.wordSlots.style.setProperty("--slot-padding-y", `${paddingY}px`);
  ui.wordSlots.style.setProperty("--slot-padding-x", `${paddingX}px`);
}

function renderKeyboard() {
  ui.keyboard.querySelectorAll(".key-button").forEach((button) => {
    const letter = button.dataset.letter;
    const guessed = state.guessedLetters.has(letter);

    button.disabled = state.status !== "playing" || guessed;

    if (!guessed) {
      button.dataset.state = "idle";
      return;
    }

    button.dataset.state = state.currentWord.includes(letter) ? "hit" : "miss";
  });
}

function renderHangman() {
  PART_ORDER.forEach((partId, index) => {
    const part = document.getElementById(partId);
    part.classList.toggle("is-visible", index < state.wrongLetters.length);
  });
}

function renderPersistentStats() {
  const totalRounds = stats.wins + stats.losses;
  const winRate = totalRounds === 0 ? 0 : Math.round((stats.wins / totalRounds) * 100);

  ui.bestScoreValue.textContent = stats.highScore.toLocaleString();
  ui.bestStreakValue.textContent = stats.bestStreak.toLocaleString();
  ui.winsValue.textContent = stats.wins.toLocaleString();
  ui.lossesValue.textContent = stats.losses.toLocaleString();
  ui.winRateValue.textContent = `${winRate}%`;
  ui.perfectRoundsValue.textContent = stats.perfectRounds.toLocaleString();

  if (!stats.signatureSolve) {
    ui.signatureWord.textContent = "No record yet";
    ui.signatureDescription.textContent =
      "Crack a difficult word in very few guesses to own this spot.";
    ui.signatureDifficulty.textContent = "Difficulty --";
    ui.signatureGuesses.textContent = "Guesses --";
    return;
  }

  ui.signatureWord.textContent = stats.signatureSolve.word;
  ui.signatureDescription.textContent =
    `A ${getDifficultyLabel(stats.signatureSolve.difficulty).toLowerCase()} solve with ${stats.signatureSolve.misses} mistake${stats.signatureSolve.misses === 1 ? "" : "s"} and ${stats.signatureSolve.roundScore.toLocaleString()} points.`;
  ui.signatureDifficulty.textContent = `Difficulty ${stats.signatureSolve.difficulty}`;
  ui.signatureGuesses.textContent = `Guesses ${stats.signatureSolve.guesses}`;
}

function renderHistory() {
  ui.historyList.innerHTML = "";

  if (!state.history.length) {
    const item = document.createElement("li");
    item.className = "history-item";

    const title = document.createElement("strong");
    title.textContent = "Fresh run, clean slate";

    const detail = document.createElement("span");
    detail.textContent = "Solve a word to start the session feed.";

    item.append(title, detail);
    ui.historyList.append(item);
    return;
  }

  state.history.forEach((entry) => {
    const item = document.createElement("li");
    item.className = `history-item ${entry.type === "win" ? "is-win" : "is-loss"}`;

    const title = document.createElement("strong");
    title.textContent = entry.title;

    const detail = document.createElement("span");
    detail.textContent = entry.detail;

    item.append(title, detail);
    ui.historyList.append(item);
  });
}

function addHistoryEntry(entry) {
  state.history.unshift(entry);
  state.history = state.history.slice(0, 6);
  renderHistory();
}

function setBanner({
  visible,
  eyebrow = "",
  title = "",
  text = "",
  primaryLabel = "",
  primaryAction = null,
  primaryDisabled = false,
  secondaryLabel = "",
  secondaryAction = null,
} = {}) {
  bannerActions.primary = primaryAction;
  bannerActions.secondary = secondaryAction;

  ui.bannerEyebrow.textContent = eyebrow;
  ui.bannerTitle.textContent = title;
  ui.bannerText.textContent = text;

  ui.primaryAction.hidden = !primaryLabel;
  ui.primaryAction.textContent = primaryLabel || "";
  ui.primaryAction.disabled = primaryDisabled || !primaryAction;

  ui.secondaryAction.hidden = !secondaryLabel;
  ui.secondaryAction.textContent = secondaryLabel || "";

  ui.banner.classList.toggle("is-hidden", !visible);
}

function hideBanner() {
  bannerActions.primary = null;
  bannerActions.secondary = null;
  ui.banner.classList.add("is-hidden");
}

function triggerStageShake() {
  window.clearTimeout(state.timers.shake);
  ui.gallowsStage.classList.remove("is-shaking");
  void ui.gallowsStage.offsetWidth;
  ui.gallowsStage.classList.add("is-shaking");
  state.timers.shake = window.setTimeout(() => {
    ui.gallowsStage.classList.remove("is-shaking");
  }, 450);
}

function triggerStageCelebrate() {
  window.clearTimeout(state.timers.celebrate);
  ui.gallowsStage.classList.remove("is-celebrating");
  void ui.gallowsStage.offsetWidth;
  ui.gallowsStage.classList.add("is-celebrating");
  state.timers.celebrate = window.setTimeout(() => {
    ui.gallowsStage.classList.remove("is-celebrating");
  }, 920);
}

function getDifficultyLabel(difficulty) {
  if (difficulty < 56) {
    return "Smooth";
  }

  if (difficulty < 76) {
    return "Sharp";
  }

  if (difficulty < 98) {
    return "Savage";
  }

  return "Mythic";
}

function announce(message) {
  ui.announcer.textContent = message;
}

function loadStats() {
  const defaults = {
    highScore: 0,
    bestStreak: 0,
    wins: 0,
    losses: 0,
    perfectRounds: 0,
    signatureSolve: null,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return defaults;
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaults,
      ...parsed,
    };
  } catch (error) {
    console.warn("Could not read stored stats.", error);
    return defaults;
  }
}

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (error) {
    console.warn("Could not save stored stats.", error);
  }
}
