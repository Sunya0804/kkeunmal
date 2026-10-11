"""표준국어대사전 XML 덤프에서 끝말잇기용 명사 목록을 뽑아낸다.

사용법:
    python tools/build_words.py <XML 폴더>

XML 폴더는 국립국어원 표준국어대사전 사이트(https://stdict.korean.go.kr)의
"사전 내려받기 > 전체 내려받기"로 받은 XML 파일들이 들어 있는 폴더다.
(같은 자료의 미러: https://github.com/spellcheck-ko/korean-dict-nikl-stdict)

결과물:
    data/words.js      단어 목록
    data/defs/NNN.js   단어별 뜻풀이(첫 번째 뜻, 잘라서 저장). 2,000단어씩 나눈 묶음
"""
import glob
import json
import os
import re
import shutil
import sys
import xml.etree.ElementTree as ET

DEF_MAX = 70
DEF_CHUNK = 2000  # definitions.js 의 CHUNK_SIZE 와 같아야 한다
HANGUL = re.compile(r"[가-힣]{2,}")
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")


def clean_word(raw):
    """표제어에서 붙임표(-)와 동음이의어 번호를 떼어 낸다."""
    return re.sub(r"[-\d]", "", raw)


def clean_def(text):
    text = re.sub(r"<[^>]+>", "", text or "")
    text = re.sub(r"\s+", " ", text).strip()
    if len(text) > DEF_MAX:
        text = text[:DEF_MAX].rstrip() + "…"
    return text


def main(xml_dir):
    files = sorted(glob.glob(os.path.join(xml_dir, "*.xml")))
    if not files:
        sys.exit(f"XML 파일을 찾을 수 없습니다: {xml_dir}")

    words = {}
    for path in files:
        for item in ET.parse(path).getroot().iter("item"):
            info = item.find("word_info")
            # 구·속담·관용구가 아닌 '단어'만
            if info.findtext("word_unit") != "단어":
                continue
            for pos_info in info.iter("pos_info"):
                # 의존 명사·대명사·수사는 제외하고 '명사'만
                if pos_info.findtext("pos") != "명사":
                    continue
                word = clean_word(info.findtext("word") or "")
                if not HANGUL.fullmatch(word):
                    continue
                if word not in words:
                    sense = pos_info.find(".//sense_info")
                    words[word] = clean_def(sense.findtext("definition")) if sense is not None else ""
                break

    ordered = sorted(words)
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "words.js"), "w", encoding="utf-8", newline="\n") as f:
        f.write('window.WORDS="' + ",".join(ordered) + '".split(",");\n')
    defs_dir = os.path.join(OUT_DIR, "defs")
    shutil.rmtree(defs_dir, ignore_errors=True)
    os.makedirs(defs_dir)
    for n, start in enumerate(range(0, len(ordered), DEF_CHUNK)):
        text = "\n".join(words[w] for w in ordered[start:start + DEF_CHUNK])
        with open(os.path.join(defs_dir, f"{n:03d}.js"), "w", encoding="utf-8", newline="\n") as f:
            f.write(f"window.onDefsChunk({n},{json.dumps(text, ensure_ascii=False)});\n")
    print(f"명사 {len(ordered):,}개 저장")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main(sys.argv[1])
