# Học Liệu — Trang chủ các danh mục

Website tĩnh gộp tất cả tài liệu học tập vào **một trang chủ**, chia theo danh mục để dễ điều hướng. Deploy lên Vercel.

## Danh mục

| Danh mục | Nội dung | Thư mục |
|---|---|---|
| Tiếng Anh | IELTS 3.0 → 6.0 (24 tuần) | `public/english/` |
| Tiếng Nhật | JLPT N5 → N1 | `public/japanese/` |
| Tiếng Trung | HSK 1 → 6 | `public/chinese/` |
| Tech | OCP Java SE 25 (1Z0-831) | `public/tech/` |

## Cấu trúc

```
public/
  index.html          <- Trang chủ hub, chia 4 danh mục
  english/ielts.html
  japanese/jlpt-n1.html ... jlpt-n5.html
  chinese/hsk1.html ... hsk6.html
  tech/ocp-java25.html
vercel.json           <- config static hosting (cleanUrls)
```

Mỗi file là một ứng dụng tĩnh tự chứa, có nút **‹ Trang chủ** (góc trên trái) để quay về hub. Tất cả chạy trên trình duyệt, không cần server.

## Thêm một lộ trình mới

1. Đặt file app vào thư mục danh mục tương ứng (vd `public/english/toefl.html`).
2. Thêm một thẻ `<a class="tile">` vào đúng danh mục trong `public/index.html` (tiêu đề, màu icon, mô tả, `href`).
3. Commit & push là xong.

## Lưu dữ liệu (localStorage)

Mỗi app tự lưu tiến độ bằng `localStorage` với key riêng nên không đè nhau:
- IELTS: `ielts-36-v1`
- JLPT N5..N1: `jlpt-n5-v1` .. `jlpt-n1-v1`
- HSK 1..6: `hsk1-v1` .. `hsk6-v1`
- OCP Java: `ocp-java25-v1`

Nhiều app còn có nút **Tải bản sao lưu / Khôi phục** trong mục Cài đặt để chuyển dữ liệu sang máy khác.

## Deploy lên Vercel

### Cách 1: Vercel CLI
```bash
cd hoc-lieu
vercel --prod
```

### Cách 2: GitHub
1. Push project lên GitHub.
2. Vào [vercel.com](https://vercel.com) → Add New Project → chọn repo → Deploy.

- **Framework Preset:** Other
- **Build:** không cần (`vercel.json` chỉ bật `cleanUrls`)