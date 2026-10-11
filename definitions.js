// 뜻풀이는 용량이 커서 여러 파일(data/defs/000.js, 001.js, …)로 나눠 두고 필요한 묶음만 불러온다.
(function () {
  "use strict";

  const WORDS = window.WORDS; // 가나다순으로 정렬되어 있다
  const CHUNK_SIZE = 2000; // tools/build_words.py 의 DEF_CHUNK 와 같아야 한다
  const chunks = new Map(); // 묶음 번호 → Promise<뜻풀이 배열>
  const waiting = new Map(); // 묶음 번호 → 도착하면 부를 함수

  // 묶음 파일이 실행되면서 부르는 함수
  window.onDefsChunk = (n, text) => {
    const done = waiting.get(n);
    waiting.delete(n);
    if (done) done(text.split("\n"));
  };

  function indexOf(word) {
    let lo = 0, hi = WORDS.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (WORDS[mid] === word) return mid;
      if (WORDS[mid] < word) lo = mid + 1;
      else hi = mid - 1;
    }
    return -1;
  }

  function loadChunk(n) {
    if (!chunks.has(n)) {
      chunks.set(n, new Promise((resolve) => {
        waiting.set(n, resolve);
        const script = document.createElement("script");
        script.src = `data/defs/${String(n).padStart(3, "0")}.js`;
        script.onerror = () => {
          // 못 불러오면 뜻풀이 없이 진행하고, 다음에 다시 시도한다
          waiting.delete(n);
          chunks.delete(n);
          resolve([]);
        };
        document.head.append(script);
      }));
    }
    return chunks.get(n);
  }

  // 단어의 뜻풀이. 사전에 없는 단어면 빈 문자열.
  function of(word) {
    const index = indexOf(word);
    if (index < 0) return Promise.resolve("");
    return loadChunk(Math.floor(index / CHUNK_SIZE)).then((defs) => defs[index % CHUNK_SIZE] || "");
  }

  // element 에 word 의 뜻풀이를 채운다. 기다리는 사이 다른 단어로 바뀌었으면 건드리지 않는다.
  function fill(element, word) {
    element.textContent = "";
    element.dataset.word = word;
    of(word).then((text) => {
      if (element.dataset.word === word) element.textContent = text;
    });
  }

  window.Definitions = { of, fill };
})();
