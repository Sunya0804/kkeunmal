// 화면 처리: 차례 진행, 타이머, 기록 표시
(function () {
  "use strict";

  const { Game, startsFor, KILL_CHANCE, GREEDY_LEVEL, PERFECT_LEVEL } = window.Kkeunmal;
  const WORDS = window.WORDS;
  const HINTS_PER_GAME = 3;
  const RECORD_KEY = "kkeunmal-record";
  const DEFAULT_SECONDS = 15;
  const DEFAULT_LEVEL = 4;
  const MAX_SECONDS = 999;
  const percent = (p) => Math.round(p * 100) + "%";
  const LEVELS = {
    1: "한방단어를 쓰지 않습니다. 이어 가기 쉬운 짧은 단어 위주로 냅니다.",
    [GREEDY_LEVEL]: "한방단어가 있으면 반드시 씁니다. 없으면 내가 이을 단어가 가장 적어지는 단어를 냅니다.",
    [PERFECT_LEVEL]: "승패를 끝까지 읽어서, 이기는 단어가 있으면 그 단어만 냅니다. 없으면 승패가 갈리지 않는 단어로 버팁니다.",
  };
  for (const [level, chance] of Object.entries(KILL_CHANCE)) {
    LEVELS[level] = `아무 단어나 내다가, 한방단어가 있으면 ${percent(chance)} 확률로 씁니다.`;
  }

  const $ = (id) => document.getElementById(id);
  const el = {
    level: $("level"), levelDesc: $("levelDesc"), levelList: $("levelList"),
    timeMode: $("timeMode"), timeCustom: $("timeCustom"), timeSeconds: $("timeSeconds"), first: $("first"), newGame: $("newGame"),
    turn: $("turn"), current: $("current"), definition: $("definition"), timerBar: $("timerBar"),
    form: $("form"), input: $("input"), submit: $("submit"), message: $("message"),
    hint: $("hint"), hintLeft: $("hintLeft"), giveUp: $("giveUp"),
    cheat: $("cheat"), cheatPanel: $("cheatPanel"), cheatList: $("cheatList"),
    chainLen: $("chainLen"), wins: $("wins"), losses: $("losses"),
    history: $("history"), wordCount: $("wordCount"),
  };

  const game = new Game(WORDS);
  let state = "idle"; // idle | player | computer | over
  let hintsLeft = HINTS_PER_GAME;
  let deadline = 0;
  let timerId = null;
  let thinkId = null;
  let cheatOpen = false;
  let record = loadRecord();

  function loadRecord() {
    try {
      const saved = JSON.parse(localStorage.getItem(RECORD_KEY));
      if (saved && Number.isInteger(saved.wins) && Number.isInteger(saved.losses)) return saved;
    } catch (e) { /* 저장소를 못 쓰면 이번 실행 동안만 센다 */ }
    return { wins: 0, losses: 0 };
  }

  function saveRecord() {
    try { localStorage.setItem(RECORD_KEY, JSON.stringify(record)); } catch (e) { /* 무시 */ }
  }

  function setMessage(text, kind) {
    el.message.textContent = text;
    el.message.className = "message" + (kind ? " " + kind : "");
  }

  function setInputEnabled(on) {
    el.input.disabled = !on;
    el.submit.disabled = !on;
    el.giveUp.disabled = !on;
    el.hint.disabled = !on || hintsLeft === 0;
    el.cheat.disabled = !on || !game.lastChar;
    if (on) el.input.focus();
  }

  function renderRecord() {
    el.chainLen.textContent = game.history.length;
    el.wins.textContent = record.wins;
    el.losses.textContent = record.losses;
    el.hintLeft.textContent = hintsLeft;
  }

  function renderWord(entry) {
    const { word, by } = entry;
    el.current.textContent = "";
    el.current.append(word.slice(0, -1));
    const last = document.createElement("span");
    last.className = "last";
    last.textContent = word.slice(-1);
    el.current.append(last);
    el.current.className = "current " + by;
    window.Definitions.fill(el.definition, word);

    const li = document.createElement("li");
    li.className = by;
    const who = document.createElement("span");
    who.className = "who";
    who.textContent = by === "player" ? "나" : "컴퓨터";
    const w = document.createElement("b");
    w.textContent = word;
    const d = document.createElement("span");
    d.className = "def";
    window.Definitions.fill(d, word);
    li.append(who, w, d);
    el.history.prepend(li);
    renderRecord();
  }

  function renderCheat() {
    el.cheatList.textContent = "";
    if (!cheatOpen || state !== "player" || !game.lastChar) {
      el.cheatPanel.hidden = true;
      return;
    }
    el.cheatPanel.hidden = false;
    window.CheatView.render(el.cheatList, game.cheatList());
  }

  function renderLevel() {
    el.levelDesc.textContent = `${el.level.value}단계: ${LEVELS[el.level.value]}`;
  }

  // 제한 시간(초). 없음이면 0. 잘못된 입력은 고쳐서 입력 칸에도 반영한다.
  function timeLimitSeconds() {
    if (el.timeMode.value === "none") return 0;
    let seconds = Math.round(Number(el.timeSeconds.value));
    if (!Number.isFinite(seconds) || seconds < 1) seconds = DEFAULT_SECONDS;
    seconds = Math.min(seconds, MAX_SECONDS);
    el.timeSeconds.value = seconds;
    return seconds;
  }

  function stopTimer() {
    clearInterval(timerId);
    timerId = null;
  }

  function startTimer() {
    stopTimer();
    const limit = timeLimitSeconds() * 1000;
    el.timerBar.style.width = "100%";
    el.timerBar.classList.remove("urgent");
    if (!limit) return;
    deadline = Date.now() + limit;
    timerId = setInterval(() => {
      const left = deadline - Date.now();
      el.timerBar.style.width = Math.max(0, (left / limit) * 100) + "%";
      el.timerBar.classList.toggle("urgent", left < Math.min(5000, limit / 3));
      if (left <= 0) finish(false, "시간 초과!");
    }, 100);
  }

  function playerTurn() {
    if (game.lastChar && !game.candidates().length) {
      finish(false, `'${game.lastChar}'(으)로 시작하는 단어가 더 없어요. 한방단어에 당했습니다!`);
      return;
    }
    state = "player";
    const last = game.lastChar;
    el.turn.textContent = last
      ? `내 차례 — '${startsFor(last).join("' 또는 '")}'(으)로 시작하는 단어`
      : "내 차례 — 아무 단어로나 시작하세요";
    el.input.value = "";
    setInputEnabled(true);
    startTimer();
    if (cheatOpen) {
      stopTimer();
      renderCheat();
    }
  }

  function computerTurn() {
    state = "computer";
    stopTimer();
    setInputEnabled(false);
    renderCheat();
    el.turn.textContent = "컴퓨터가 생각하는 중…";
    thinkId = setTimeout(() => {
      const word = game.pickComputer(Number(el.level.value));
      if (!word) {
        finish(true, "컴퓨터가 단어를 잇지 못했어요.");
        return;
      }
      game.play(word, "computer");
      renderWord(game.history[game.history.length - 1]);
      playerTurn();
    }, 500 + Math.random() * 600);
  }

  function finish(won, reason) {
    const wasPlayerTurn = state === "player";
    state = "over";
    stopTimer();
    clearTimeout(thinkId);
    setInputEnabled(false);
    renderCheat();
    if (won) record.wins++;
    else record.losses++;
    saveRecord();
    renderRecord();
    el.turn.textContent = won ? "승리!" : "패배…";
    let text = reason + (won ? " 이겼습니다!" : "");
    if (!won && wasPlayerTurn) {
      const example = game.hint();
      if (example) text += ` (예: ${example})`;
    }
    setMessage(text, won ? "win" : "lose");
    el.newGame.focus();
  }

  function newGame() {
    stopTimer();
    clearTimeout(thinkId);
    game.reset();
    hintsLeft = HINTS_PER_GAME;
    cheatOpen = false;
    el.history.textContent = "";
    el.current.textContent = "끝말잇기";
    el.current.className = "current";
    el.definition.dataset.word = "";
    el.definition.textContent = "";
    setMessage("");
    renderRecord();
    let first = el.first.value;
    if (first === "random") first = Math.random() < 0.5 ? "player" : "computer";
    if (first === "computer") computerTurn();
    else playerTurn();
  }

  el.form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state !== "player") return;
    const word = el.input.value.trim();
    if (!word) return;
    const error = game.check(word);
    if (error) {
      setMessage(error, "error");
      el.input.select();
      return;
    }
    setMessage("");
    game.play(word, "player");
    renderWord(game.history[game.history.length - 1]);
    computerTurn();
  });

  el.hint.addEventListener("click", () => {
    if (state !== "player" || hintsLeft === 0) return;
    const word = game.hint();
    if (!word) return;
    hintsLeft--;
    renderRecord();
    el.hint.disabled = hintsLeft === 0;
    setMessage(`힌트: ${word}`, "hint");
    el.input.focus();
  });

  el.giveUp.addEventListener("click", () => {
    if (state === "player") finish(false, "포기했습니다.");
  });

  el.cheat.addEventListener("click", () => {
    if (state !== "player") return;
    cheatOpen = !cheatOpen;
    if (cheatOpen) stopTimer();
    renderCheat();
  });

  // 목록의 단어를 누르면 입력 칸에 넣는다
  el.cheatList.addEventListener("click", (e) => {
    if (state !== "player" || e.target.tagName !== "BUTTON") return;
    if (!e.target.closest(".cheat-words")) return;
    el.input.value = e.target.textContent;
    el.input.focus();
  });

  el.newGame.addEventListener("click", newGame);

  el.level.addEventListener("change", renderLevel);
  el.timeMode.addEventListener("change", () => {
    el.timeCustom.hidden = el.timeMode.value === "none";
  });
  el.timeSeconds.addEventListener("change", timeLimitSeconds);

  for (const [level, text] of Object.entries(LEVELS)) {
    const option = document.createElement("option");
    option.value = level;
    option.textContent = level + "단계";
    option.selected = Number(level) === DEFAULT_LEVEL;
    el.level.append(option);
    const li = document.createElement("li");
    li.textContent = text;
    el.levelList.append(li);
  }
  renderLevel();
  el.wordCount.textContent = WORDS.length.toLocaleString("ko-KR");
  renderRecord();
})();
