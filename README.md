# 컴퓨터와 하는 끝말잇기

표준국어대사전에 실린 표준어 명사만으로 컴퓨터와 겨루는 끝말잇기.

## 실행

`index.html`을 브라우저로 열면 된다. 서버나 설치는 필요 없다.

## 구성

| 파일 | 역할 |
| --- | --- |
| `index.html`, `style.css`, `ui.js` | 게임 화면 |
| `db.html`, `db.js` | 전체 DB 화면 (모든 단어 목록, 이어지는 단어 찾기) |
| `cheatview.js` | 이어지는 단어를 유리한 순서로 그리는 공용 코드 |
| `engine.js` | 규칙 검사, 두음법칙, 승패 분석, 컴퓨터의 단어 선택 |
| `data/words.js`, `data/defs.js` | 명사 목록과 뜻풀이 (생성된 파일) |
| `tools/build_words.py` | 사전 XML에서 `data/`를 다시 만드는 스크립트 |

## 단어 자료 다시 만들기

1. [표준국어대사전](https://stdict.korean.go.kr)에 로그인해 "사전 내려받기 > 전체 내려받기"로 XML을 받는다.
   (미러: <https://github.com/spellcheck-ko/korean-dict-nikl-stdict>)
2. `python tools/build_words.py <XML 폴더>`

품사가 `명사`인 `단어`만 뽑고(구·의존 명사·대명사·수사 제외), 한글 두 글자 이상만 남긴다.
현재 `data/`는 2019년 6월 25일 자 사전 자료로 만들었다.

## 출처

단어와 뜻풀이: 국립국어원 표준국어대사전, [CC BY-SA 2.0 KR](https://creativecommons.org/licenses/by-sa/2.0/kr/)
