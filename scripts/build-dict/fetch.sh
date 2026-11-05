#!/usr/bin/env sh
# Tải dữ liệu nguồn cho build.js vào thư mục RAW (mặc định ./raw — không commit).
# Dùng: sh scripts/build-dict/fetch.sh [RAW]
set -e
RAW="${1:-$(dirname "$0")/raw}"
mkdir -p "$RAW/krad" "$RAW/unihan"
cd "$RAW"
curl -sSLO https://www.edrdg.org/kanjidic/kanjidic2.xml.gz
curl -sSLO http://ftp.edrdg.org/pub/Nihongo/kradzip.zip
curl -sSL -o kanjivg.xml.gz "$(curl -sSL https://api.github.com/repos/KanjiVG/kanjivg/releases/latest | grep -o 'https://[^"]*kanjivg-[0-9]*\.xml\.gz' | head -1)"
curl -sSL -o mmah-dict.txt https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt
curl -sSL -o mmah-graphics.txt https://raw.githubusercontent.com/skishore/makemeahanzi/master/graphics.txt
curl -sSLO https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip
curl -sSL -o hsk-complete.min.json https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.min.json
unzip -oq kradzip.zip -d krad
unzip -oq Unihan.zip -d unihan
echo "Xong: $RAW"
