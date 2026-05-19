# Hướng dẫn deploy lên Railway

## Tại sao cần Volume?

Railway có **ephemeral filesystem** — mỗi lần redeploy sẽ xóa sạch mọi file tạm.
Không có Volume thì:
- `data/store.db` (lịch sử đã comment, tracking tweet) bị mất → bot comment lại bài cũ
- `data/cookies.json` và `data/config.json` được tạo lại từ env vars mỗi lần (OK)
- `data/run.log` bị mất (không quan trọng lắm)

**Với Volume gắn vào `/app/data`**, toàn bộ thư mục `data/` được giữ nguyên qua mọi lần redeploy.

---

## Các bước deploy

### Bước 1 — Tạo project trên Railway

1. Vào [railway.app](https://railway.app) → **New Project**
2. Chọn **Deploy from GitHub repo** → chọn repo này
3. Railway tự detect `railway.toml` và build bằng Nixpacks (Node.js)

### Bước 2 — Thêm Volume (persistent storage)

> Làm bước này **trước khi set env vars** để tránh mất data.

1. Trong project, click service vừa tạo → tab **Volumes**
2. Click **Add Volume**
3. Điền:
   - **Mount Path**: `/app/data`
   - **Size**: 1 GB là đủ (có thể tăng sau)
4. Click **Add**

Railway sẽ redeploy lần đầu với volume trống — hoàn toàn bình thường.

### Bước 3 — Set Environment Variables

Tab **Variables** → thêm từng biến:

#### Bắt buộc

| Variable | Ví dụ | Ghi chú |
|----------|-------|---------|
| `TWITTER_COOKIES` | `[{"name":"auth_token","value":"...","domain":".x.com","path":"/"},{"name":"ct0","value":"...","domain":".x.com","path":"/"}]` | Cookie-Editor JSON array, hoặc `{"auth_token":"...","ct0":"..."}` |
| `AI_API_KEY` | `sk-...` | API key của AI provider |

#### Theo mode

| Variable | Mode | Ví dụ |
|----------|------|-------|
| `MODE` | tất cả | `A` / `B` / `C` (default: `A`) |
| `LIST_IDS` | A, C | `1234567890,9876543210` |
| `LANGUAGE` | A, C | `auto` / `en` / `vi` / `ja` (default: `auto`) |
| `STYLE_PROMPT` | A, C | `trader chuyên nghiệp, ngắn gọn dưới 200 ký tự` |
| `OWNER_USERNAME` | B, C | `your_handle` (không có @) |
| `HASHTAGS` | B, C | `#XAUUSD,#Gold,#Crypto` |

#### Tuỳ chọn

| Variable | Mặc định | Ghi chú |
|----------|----------|---------|
| `AI_PROVIDER` | `deepseek` | `deepseek` / `openai` / `anthropic` |
| `AI_MODEL` | _(provider default)_ | VD: `deepseek-chat`, `gpt-4o-mini` |
| `COMMENTS_PER_HOUR` | `15` | Khuyến nghị ≤ 20 |
| `DELAY_MIN_MS` | `60000` | 60 giây |
| `DELAY_MAX_MS` | `240000` | 240 giây |
| `TELEGRAM_BOT_TOKEN` | _(không bắt buộc)_ | Nhận cảnh báo qua Telegram |
| `TELEGRAM_CHAT_ID` | _(không bắt buộc)_ | ID chat Telegram |

### Bước 4 — Deploy

Sau khi set xong env vars, Railway tự trigger redeploy.
Xem logs trong tab **Deployments** → **View Logs**.

Dòng đầu tiên sẽ là:
```
[env-to-config] wrote /app/data/cookies.json
[env-to-config] wrote /app/data/config.json
[env-to-config] done — starting app...
[2026-xx-xx] Twitter Comment Pack starting...
```

---

## Cập nhật cookies khi hết hạn

Cookies Twitter hết hạn sau ~2–4 tuần. Khi bot báo `SESSION_EXPIRED`:

1. Export cookies mới từ trình duyệt (xem `guides/01-get-cookies.md`)
2. Vào Railway → Variables → cập nhật `TWITTER_COOKIES`
3. **Xoá file cookies cũ trên volume**: vào tab Volumes → Connect → xoá `cookies.json`
   - Hoặc: Railway sẽ **không** tự ghi đè vì script kiểm tra file đã tồn tại. Cần xoá thủ công hoặc redeploy với biến `FORCE_REINIT=1` (xem bên dưới).

### Cách force ghi lại config/cookies

Thêm biến `FORCE_REINIT=1` vào Variables, redeploy, sau đó xoá biến đó đi.
Script `env-to-config.mjs` sẽ ghi đè file nếu thấy biến này.

---

## Troubleshooting

| Lỗi | Nguyên nhân | Cách fix |
|-----|-------------|----------|
| `Missing data/config.json` | Volume chưa được mount, script chưa chạy | Kiểm tra lại Mount Path là `/app/data` |
| `ct0 cookie not found` | `TWITTER_COOKIES` thiếu cookie `ct0` | Re-export cookies, cập nhật env var |
| `RATE_LIMITED 429/403` | Bot comment quá nhanh | Giảm `COMMENTS_PER_HOUR` xuống ≤ 10 |
| `SESSION_EXPIRED` | Cookies hết hạn | Xoá `cookies.json` trên volume, cập nhật env var |
| `AI 401` | API key sai | Cập nhật `AI_API_KEY` |
