# Nguồn & giấy phép dữ liệu trong `public/data/`

Các file JSON ở đây được sinh bằng `scripts/build-dict/build.js` từ những nguồn sau. Dữ liệu dẫn xuất từ nguồn CC BY-SA cũng được phát hành theo **CC BY-SA 4.0**.

| Nguồn | Dùng cho | Giấy phép |
|---|---|---|
| [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project) © Electronic Dictionary Research and Development Group | Âm On/Kun, nghĩa tiếng Anh, số nét, bộ thủ, lớp, tần suất, âm Hán-Việt | CC BY-SA 4.0 |
| [RADKFILE/KRADFILE](https://www.edrdg.org/krad/kradinf.html) © EDRDG | Thành phần để tra kanji | CC BY-SA 4.0 |
| [KanjiVG](https://kanjivg.tagaini.net/) © Ulrich Apel | Nét chữ, thứ tự nét, cây thành phần kanji | CC BY-SA 3.0 |
| [Make Me a Hanzi](https://github.com/skishore/makemeahanzi) | Nét chữ, trung vị nét, phân tích IDS, nguồn gốc chữ Hán | Arphic Public License (đồ hoạ) / LGPL (từ điển) |
| [Unihan](https://www.unicode.org/charts/unihan.html) © Unicode, Inc. | Âm Việt, bộ + nét, biến thể phồn/giản | Unicode License v3 |
| [complete-hsk-vocabulary](https://github.com/drkameleon/complete-hsk-vocabulary) © Yanis Zafirópulos | Từ và cấp HSK 3.0 | MIT |
| Học liệu JLPT/HSK trong repo này | Nghĩa tiếng Việt, mẹo nhớ, tên thành phần tiếng Việt | — |

Bảng 214 bộ Khang Hy (tên Hán-Việt, ý nghĩa) do repo tự soạn: `scripts/build-dict/radicals.txt`.

Tạo lại dữ liệu: `sh scripts/build-dict/fetch.sh <thư mục tạm>` rồi `node scripts/build-dict/build.js <thư mục tạm>`.
