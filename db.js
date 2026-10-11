// 전체 DB 화면: 모든 단어 목록과, 고른 단어에 이어지는 단어 찾기
(function () {
  "use strict";

  const { Game, startsFor } = window.Kkeunmal;
  const WORDS = window.WORDS; // 가나다 오름차순으로 정렬되어 있다
  const PAGE_SIZE = 300;
  const PAGE_COUNT = Math.ceil(WORDS.length / PAGE_SIZE);

  const $ = (id) => document.getElementById(id);
  const el = {
    wordCount: $("wordCount"), searchForm: $("searchForm"), search: $("search"), searchMessage: $("searchMessage"),
    resultPanel: $("resultPanel"), resultTitle: $("resultTitle"), resultDef: $("resultDef"), resultList: $("resultList"),
    order: $("order"), prev: $("prev"), next: $("next"), page: $("page"), pageCount: $("pageCount"), words: $("words"),
  };

  const game = new Game(WORDS);
  let page = 1;

  function renderPage() {
    page = Math.min(Math.max(1, Math.round(Number(page)) || 1), PAGE_COUNT);
    el.page.value = page;
    el.prev.disabled = page === 1;
    el.next.disabled = page === PAGE_COUNT;
    const desc = el.order.value === "desc";
    const start = (page - 1) * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, WORDS.length);
    el.words.textContent = "";
    for (let i = start; i < end; i++) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = WORDS[desc ? WORDS.length - 1 - i : i];
      el.words.append(b);
    }
  }

  // word 다음에 이을 수 있는 단어를 유리한 순서로 보여 준다
  function showNext(word) {
    el.searchMessage.textContent = "";
    if (!/^[가-힣]+$/.test(word)) {
      el.searchMessage.textContent = "한글로만 입력해 주세요.";
      return;
    }
    game.setPrevious(word);
    // 첫 차례 한방단어 금지는 게임 규칙일 뿐이므로 여기서는 표시하지 않는다
    const items = game.cheatList().map((item) => ({ ...item, banned: false }));
    const starts = startsFor(game.lastChar).join("' 또는 '");
    el.resultTitle.textContent = `'${word}' 다음: '${starts}'(으)로 시작하는 단어 ${items.length.toLocaleString("ko-KR")}개`;
    if (game.wordSet.has(word)) {
      window.Definitions.fill(el.resultDef, word);
    } else {
      el.resultDef.dataset.word = "";
      el.resultDef.textContent = "(이 단어는 DB에 없습니다. 끝 글자로 이어지는 단어만 보여 드립니다.)";
    }
    window.CheatView.render(el.resultList, items);
    el.resultPanel.hidden = false;
    el.search.value = word;
    el.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  el.searchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const word = el.search.value.trim();
    if (word) showNext(word);
  });

  const onWordClick = (e) => {
    if (e.target.tagName === "BUTTON" && e.target.closest(".db-words, .cheat-words")) {
      showNext(e.target.textContent);
    }
  };
  el.words.addEventListener("click", onWordClick);
  el.resultList.addEventListener("click", onWordClick);

  el.order.addEventListener("change", () => { page = 1; renderPage(); });
  el.prev.addEventListener("click", () => { page--; renderPage(); });
  el.next.addEventListener("click", () => { page++; renderPage(); });
  el.page.addEventListener("change", () => { page = el.page.value; renderPage(); });

  el.wordCount.textContent = WORDS.length.toLocaleString("ko-KR");
  el.pageCount.textContent = PAGE_COUNT.toLocaleString("ko-KR");
  renderPage();
})();
