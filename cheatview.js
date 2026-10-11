// 이을 수 있는 단어 목록을 유리한 순서로 묶어서 그린다 (게임 화면과 전체 DB 화면 공용).
(function () {
  "use strict";

  const PREVIEW = 60; // 묶음마다 처음에 보여 줄 단어 수

  // 묶음 순서: 한방(W+0) → 빨리 이기는 순 → 순환 → 늦게 지는 순
  function rank(item) {
    if (item.outcome === "W") return item.turns;
    if (item.outcome === null) return 1e6;
    return 2e6 - item.turns;
  }

  function label(item) {
    if (item.outcome === "W") return "W+" + item.turns;
    if (item.outcome === "L") return "L-" + item.turns;
    return "순환";
  }

  function describe(item) {
    if (item.outcome === null) return "승패가 정해지지 않는 글자로 끝남";
    if (item.outcome === "W") {
      return item.turns === 0 ? "한방단어, 바로 이김" : `${item.turns}턴 안에 이김`;
    }
    return `${item.turns}턴 안에 짐`;
  }

  // items: Game.cheatList() 의 결과. 단어는 .cheat-words 안의 button 으로 그려진다.
  function render(container, items) {
    container.textContent = "";
    if (!items.length) {
      const none = document.createElement("p");
      none.className = "cheat-none";
      none.textContent = "(다음에 올 수 있는 단어가 사전에 존재하지 않습니다!)";
      container.append(none);
      return;
    }

    const groups = new Map();
    for (const item of items) {
      const key = label(item);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }
    const ordered = [...groups.values()].sort((a, b) => rank(a[0]) - rank(b[0]));
    for (const group of ordered) {
      // 같은 값이면 짧은 단어 먼저
      group.sort((a, b) => a.word.length - b.word.length || (a.word < b.word ? -1 : 1));
      const head = group[0];
      const kind = head.outcome === "W" ? (head.turns === 0 ? "kill" : "win") : head.outcome === "L" ? "lose" : "loop";
      const box = document.createElement("div");
      box.className = "cheat-group " + kind;
      const title = document.createElement("h3");
      title.textContent = `${label(head)} · ${describe(head)} · ${group.length.toLocaleString("ko-KR")}개`;
      if (head.banned) title.textContent += " (첫 차례에는 쓸 수 없음)";
      const list = document.createElement("div");
      list.className = "cheat-words";
      const addWords = (from, to) => {
        for (const item of group.slice(from, to)) {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = item.word;
          b.disabled = item.banned;
          list.append(b);
        }
      };
      addWords(0, PREVIEW);
      box.append(title, list);
      if (group.length > PREVIEW) {
        const more = document.createElement("button");
        more.type = "button";
        more.className = "cheat-more";
        more.textContent = `나머지 ${(group.length - PREVIEW).toLocaleString("ko-KR")}개 더 보기`;
        more.addEventListener("click", () => {
          addWords(PREVIEW, group.length);
          more.remove();
        });
        box.append(more);
      }
      container.append(box);
    }
  }

  window.CheatView = { render };
})();
