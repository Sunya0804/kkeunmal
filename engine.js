// 끝말잇기 규칙과 컴퓨터의 수 읽기. 화면과 무관하게 동작한다(브라우저·Node 공용).
(function (root) {
  "use strict";

  const HANGUL_START = 0xac00;
  const HANGUL_END = 0xd7a3;
  const CHO_N = 2, CHO_R = 5, CHO_IEUNG = 11;
  // 중성 번호: ㅏ0 ㅐ1 ㅑ2 ㅒ3 ㅓ4 ㅔ5 ㅕ6 ㅖ7 ㅗ8 ㅘ9 ㅙ10 ㅚ11 ㅛ12 ㅜ13 ㅝ14 ㅞ15 ㅟ16 ㅠ17 ㅡ18 ㅢ19 ㅣ20
  const R_TO_IEUNG = [2, 6, 7, 12, 17, 20]; // 랴 려 례 료 류 리 → 야 여 예 요 유 이
  const R_TO_N = [0, 1, 8, 11, 13, 18];     // 라 래 로 뢰 루 르 → 나 내 노 뇌 누 느
  const N_TO_IEUNG = [6, 12, 17, 20];       // 녀 뇨 뉴 니 → 여 요 유 이

  // 두음법칙을 적용한 글자를 돌려준다. 해당 없으면 그대로.
  function dueum(ch) {
    const code = ch.charCodeAt(0);
    if (code < HANGUL_START || code > HANGUL_END) return ch;
    const offset = code - HANGUL_START;
    const cho = Math.floor(offset / 588);
    const jung = Math.floor((offset % 588) / 28);
    let next = cho;
    if (cho === CHO_R) {
      if (R_TO_IEUNG.includes(jung)) next = CHO_IEUNG;
      else if (R_TO_N.includes(jung)) next = CHO_N;
    } else if (cho === CHO_N && N_TO_IEUNG.includes(jung)) {
      next = CHO_IEUNG;
    }
    return String.fromCharCode(code + (next - cho) * 588);
  }

  // 끝 글자 ch 뒤에 올 수 있는 첫 글자들 (원래 글자 + 두음법칙 글자)
  function startsFor(ch) {
    const d = dueum(ch);
    return d === ch ? [ch] : [ch, d];
  }

  // 난이도: 1단계는 한방단어를 쓰지 않고, 2~6단계는 아래 확률로 쓰고,
  // 7단계는 한 수 앞만 보고 공격하고, 8단계는 승패를 끝까지 읽는다.
  const KILL_CHANCE = { 2: 0.03, 3: 0.07, 4: 0.12, 5: 0.18, 6: 0.25 };
  const GREEDY_LEVEL = 7;
  const PERFECT_LEVEL = 8;

  const lastOf =(word) => word[word.length - 1];
  const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

  class Game {
    constructor(words) {
      this.words = words;
      this.wordSet = new Set(words);
      this.byFirst = new Map();
      for (const w of words) {
        const list = this.byFirst.get(w[0]);
        if (list) list.push(w);
        else this.byFirst.set(w[0], [w]);
      }
      this.reset();
    }

    reset() {
      this.used = new Set();
      this.history = []; // { word, by: "player" | "computer" }
      this.remaining = new Map();
      for (const [ch, list] of this.byFirst) this.remaining.set(ch, list.length);
    }

    // 새 판을 시작하면서 word 를 직전에 나온 단어로 둔다 (사전에 없는 단어여도 된다).
    setPrevious(word) {
      this.reset();
      if (this.wordSet.has(word)) this.play(word, "computer");
      else this.history.push({ word, by: "computer" });
    }

    get lastChar() {
      const n = this.history.length;
      return n ? lastOf(this.history[n - 1].word) : null;
    }

    // 끝 글자 ch 로 이을 수 있는 남은 단어 수
    countNext(ch) {
      let n = 0;
      for (const s of startsFor(ch)) n += this.remaining.get(s) || 0;
      return n;
    }

    // word 를 낸 직후 상대가 이을 수 있는 단어 수
    countAfter(word) {
      const end = lastOf(word);
      const self = !this.used.has(word) && startsFor(end).includes(word[0]) ? 1 : 0;
      return this.countNext(end) - self;
    }

    candidates() {
      const last = this.lastChar;
      const lists = last
        ? startsFor(last).map((s) => this.byFirst.get(s) || [])
        : [this.words];
      const out = [];
      for (const list of lists) for (const w of list) if (!this.used.has(w)) out.push(w);
      return out;
    }

    // 낼 수 있는 단어인지 검사. 가능하면 null, 아니면 이유를 돌려준다.
    check(word) {
      if (!/^[가-힣]+$/.test(word)) return "한글로만 입력해 주세요.";
      if (word.length < 2) return "두 글자 이상인 단어만 쓸 수 있어요.";
      const last = this.lastChar;
      if (last && !startsFor(last).includes(word[0])) {
        return `'${startsFor(last).join("' 또는 '")}'(으)로 시작해야 해요.`;
      }
      if (!this.wordSet.has(word)) return `'${word}'은(는) 표준국어대사전에 없는 명사예요.`;
      if (this.used.has(word)) return `'${word}'은(는) 이미 나온 단어예요.`;
      if (this.isOpening() && this.countAfter(word) === 0 && this.hasSafeMove()) {
        return "서로의 첫 차례에는 한방단어를 쓸 수 없어요.";
      }
      return null;
    }

    // 양쪽이 한 번씩 낼 때까지는 한방단어 금지
    isOpening() {
      return this.history.length < 2;
    }

    hasSafeMove() {
      return this.candidates().some((w) => this.countAfter(w) > 0);
    }

    play(word, by) {
      this.used.add(word);
      this.remaining.set(word[0], this.remaining.get(word[0]) - 1);
      this.history.push({ word, by });
    }

    // 컴퓨터가 낼 단어를 고른다. 낼 단어가 없으면 null.
    pickComputer(level) {
      let all = this.candidates();
      if (!all.length) return null;
      const safe = all.filter((w) => this.countAfter(w) > 0);
      if (!this.lastChar) return pickRandom(safe);
      if (this.isOpening() && safe.length) all = safe;

      // 값이 가장 작은 단어들 중 하나
      const pickMin = (list, value) => {
        let best = Infinity;
        let picks = [];
        for (const item of list) {
          const v = value(item);
          if (v < best) { best = v; picks = [item]; }
          else if (v === best) picks.push(item);
        }
        return pickRandom(picks);
      };

      if (level <= 1) {
        // 한방단어를 쓰지 않고, 이어 가기 쉬운 짧은 단어 위주로 낸다
        const roomy = safe.filter((w) => this.countAfter(w) >= 100);
        const short = roomy.filter((w) => w.length <= 3);
        return pickRandom(short.length ? short : roomy.length ? roomy : safe.length ? safe : all);
      }
      if (level >= PERFECT_LEVEL) {
        // 승패를 끝까지 읽어서, 이기는 단어가 있으면 그것만 낸다
        const list = this.cheatList().filter((i) => !i.banned);
        const wins = list.filter((i) => i.outcome === "W");
        if (wins.length) return pickMin(wins, (i) => i.turns).word;
        const loops = list.filter((i) => i.outcome === null);
        if (loops.length) return pickMin(loops, (i) => this.countAfter(i.word)).word;
        return pickMin(list, (i) => -i.turns).word;
      }
      if (level === GREEDY_LEVEL) {
        // 한방단어가 있으면 반드시 쓰고, 없으면 상대가 이을 단어가 가장 적어지는 단어를 낸다
        return pickMin(all, (w) => this.countAfter(w));
      }
      // 2~6단계: 무작위로 내다가 정해진 확률로 한방단어를 쓴다
      const kills = all.filter((w) => this.countAfter(w) === 0);
      if (kills.length && (!safe.length || Math.random() < KILL_CHANCE[level])) return pickRandom(kills);
      return pickRandom(safe);
    }

    // 남은 단어만으로 끝 글자마다 승패를 역산한다 (쌍방 최선 가정).
    // 결과: 끝 글자 → { win, depth }. win 은 그 글자를 받은 쪽이 이기는지,
    // depth 는 그 뒤로 이어지는 단어 수. 승패가 갈리지 않는(순환) 글자는 들어 있지 않다.
    analyze() {
      const ends = new Map(); // 첫 글자 → 그 글자로 시작하는 남은 단어들의 끝 글자 집합
      const states = new Set();
      for (const w of this.words) {
        if (this.used.has(w)) continue;
        const end = lastOf(w);
        states.add(end);
        const set = ends.get(w[0]);
        if (set) set.add(end);
        else ends.set(w[0], new Set([end]));
      }
      if (this.lastChar) states.add(this.lastChar);

      const preds = new Map();
      const pending = new Map(); // 아직 승패가 정해지지 않은 다음 글자 수
      const result = new Map();
      const queue = [];
      for (const ch of states) {
        const children = new Set();
        for (const s of startsFor(ch)) for (const e of ends.get(s) || []) children.add(e);
        pending.set(ch, children.size);
        for (const c of children) {
          const list = preds.get(c);
          if (list) list.push(ch);
          else preds.set(c, [ch]);
        }
        if (!children.size) {
          result.set(ch, { win: false, depth: 0 });
          queue.push(ch);
        }
      }
      for (let i = 0; i < queue.length; i++) {
        const ch = queue[i];
        const { win, depth } = result.get(ch);
        for (const p of preds.get(ch) || []) {
          if (result.has(p)) continue;
          if (!win) {
            // 지는 글자를 넘겨줄 수 있으면 이긴다
            result.set(p, { win: true, depth: depth + 1 });
            queue.push(p);
          } else {
            // 무엇을 내도 이기는 글자만 넘겨주게 되면 진다
            pending.set(p, pending.get(p) - 1);
            if (pending.get(p) === 0) {
              result.set(p, { win: false, depth: depth + 1 });
              queue.push(p);
            }
          }
        }
      }
      return result;
    }

    // 지금 낼 수 있는 모든 단어와 그 결과.
    // outcome: "W"(이김) | "L"(짐) | null(순환), turns: 그 단어 뒤로 이어지는 단어 수
    cheatList() {
      const analysis = this.analyze();
      const banKills = this.isOpening() && this.hasSafeMove();
      return this.candidates().map((word) => {
        if (this.countAfter(word) === 0) return { word, outcome: "W", turns: 0, banned: banKills };
        const r = analysis.get(lastOf(word));
        if (!r) return { word, outcome: null, turns: null, banned: false };
        return { word, outcome: r.win ? "L" : "W", turns: r.depth, banned: false };
      });
    }

    // 플레이어에게 알려 줄 힌트 단어. 가능하면 게임이 이어지는 단어로.
    hint() {
      const all = this.candidates();
      if (!all.length) return null;
      const safe = all.filter((w) => this.countAfter(w) > 0 && w.length <= 3);
      return pickRandom(safe.length ? safe : all);
    }
  }

  const api = { Game, dueum, startsFor, KILL_CHANCE, GREEDY_LEVEL, PERFECT_LEVEL };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.Kkeunmal = api;
})(typeof window !== "undefined" ? window : globalThis);
