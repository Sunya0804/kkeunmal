"""data/words.js 에서 한방단어를 찾아 hanbang.html 을 만든다.

사용법:
    python tools/build_hanbang.py

한방단어는 끝 글자(두음법칙을 적용한 글자 포함)로 시작하는 다른 명사가 하나도 없는 단어다.
규칙은 engine.js 의 dueum, countAfter 와 같아야 한다.
"""
import collections
import html
import os
import re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
SITE = "https://sunya0804.github.io/kkeunmal/"

# 중성 번호: ㅏ0 ㅐ1 ㅑ2 ㅒ3 ㅓ4 ㅔ5 ㅕ6 ㅖ7 ㅗ8 ㅘ9 ㅙ10 ㅚ11 ㅛ12 ㅜ13 ㅝ14 ㅞ15 ㅟ16 ㅠ17 ㅡ18 ㅢ19 ㅣ20
CHO_N, CHO_R, CHO_IEUNG = 2, 5, 11
R_TO_IEUNG = {2, 6, 7, 12, 17, 20}
R_TO_N = {0, 1, 8, 11, 13, 18}
N_TO_IEUNG = {6, 12, 17, 20}


def dueum(ch):
    offset = ord(ch) - 0xAC00
    cho, jung = offset // 588, (offset % 588) // 28
    new = cho
    if cho == CHO_R:
        if jung in R_TO_IEUNG:
            new = CHO_IEUNG
        elif jung in R_TO_N:
            new = CHO_N
    elif cho == CHO_N and jung in N_TO_IEUNG:
        new = CHO_IEUNG
    return chr(ord(ch) + (new - cho) * 588)


def starts_for(ch):
    return {ch, dueum(ch)}


def find_hanbang(words):
    by_first = collections.Counter(w[0] for w in words)
    groups = collections.defaultdict(list)
    for w in words:
        starts = starts_for(w[-1])
        # 자기 자신은 다시 쓸 수 없으므로 뺀다
        count = sum(by_first[s] for s in starts) - (1 if w[0] in starts else 0)
        if count == 0:
            groups[w[-1]].append(w)
    return groups


PAGE = """<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>끝말잇기 한방단어 목록 {total:,}개 - 컴퓨터와 하는 끝말잇기</title>
  <meta name="description" content="표준국어대사전 명사 기준 끝말잇기 한방단어 {total:,}개를 끝 글자별로 정리했습니다. 꾼, 것, 슨, 륨, 늄처럼 이을 단어가 없는 글자로 끝나는 단어 모음입니다.">
  <link rel="canonical" href="{site}hanbang.html">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="컴퓨터와 하는 끝말잇기">
  <meta property="og:title" content="끝말잇기 한방단어 목록 {total:,}개">
  <meta property="og:description" content="표준국어대사전 명사 기준 한방단어를 끝 글자별로 정리했습니다.">
  <meta property="og:url" content="{site}hanbang.html">
  <meta property="og:image" content="{site}og.png">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <main class="app wide">
    <header>
      <h1>끝말잇기 한방단어 목록</h1>
      <p class="sub">표준국어대사전 명사 {word_count:,}개 가운데 한방단어 {total:,}개</p>
      <nav class="nav">
        <a href="index.html">게임</a>
        <a href="guide.html">게임 방법</a>
        <a href="hanbang.html" aria-current="page">한방단어</a>
        <a href="db.html">전체 DB</a>
      </nav>
    </header>

    <section class="prose">
      <h2>한방단어란</h2>
      <p>끝말잇기에서 상대가 이을 단어가 하나도 없는 단어를 한방단어라고 부릅니다. '나트륨'을 내면 상대는 '륨'으로 시작하는 단어를 찾아야 하는데, 표준국어대사전에는 그런 명사가 없습니다. 그래서 그 자리에서 승부가 끝납니다.</p>
      <p>아래 목록은 이 사이트의 게임과 같은 기준으로 뽑았습니다. 표준국어대사전에 실린 두 글자 이상의 명사만 대상으로 했고, 두음법칙으로 바꿔도 이을 단어가 없는 경우만 넣었습니다. 예를 들어 '력'으로 끝나는 단어는 '역'으로 이을 수 있으므로 한방단어가 아닙니다.</p>
      <p>한방단어를 만드는 끝 글자는 모두 {char_count}개입니다. 그중 단어가 많은 글자는 {top}입니다. 목록은 단어가 많은 글자부터 실었습니다.</p>
      <p>이 게임에서는 서로의 첫 차례에 한방단어를 쓸 수 없습니다. 규칙과 요령은 <a href="guide.html">게임 방법</a>에서, 특정 단어 뒤에 올 수 있는 단어는 <a href="db.html">전체 DB</a>에서 찾아볼 수 있습니다.</p>
    </section>

    <section class="prose">
      <h2>끝 글자별 한방단어</h2>
{groups}
    </section>

    <footer>
      <p>단어 자료: 국립국어원 표준국어대사전 (CC BY-SA 2.0 KR), 2019년 6월 자료 기준</p>
    </footer>
  </main>
</body>
</html>
"""


def main():
    with open(os.path.join(ROOT, "data", "words.js"), encoding="utf-8") as f:
        words = re.search(r'"([^"]+)"', f.read()).group(1).split(",")

    groups = find_hanbang(words)
    ordered = sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    total = sum(len(v) for v in groups.values())
    top = ", ".join(f"'{ch}'({len(v)}개)" for ch, v in ordered[:8])
    blocks = []
    for ch, items in ordered:
        blocks.append(
            f'      <h3 id="{html.escape(ch)}">\'{html.escape(ch)}\'(으)로 끝나는 단어 <span class="count">{len(items)}개</span></h3>\n'
            f'      <p class="word-list">{html.escape(", ".join(sorted(items)))}</p>'
        )

    page = PAGE.format(
        site=SITE, total=total, word_count=len(words), char_count=len(groups),
        top=top, groups="\n".join(blocks),
    )
    with open(os.path.join(ROOT, "hanbang.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(page)
    print(f"한방단어 {total:,}개, 끝 글자 {len(groups)}개")


if __name__ == "__main__":
    main()
