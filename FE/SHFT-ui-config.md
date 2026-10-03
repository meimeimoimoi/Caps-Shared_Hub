# SHFT · UI Config (React 19 + TypeScript + Tailwind CSS v4)

> Đi kèm `SHFT-design-rules.md` v1.2. File này là **cấu hình để code**: token, CSS nền, class component, hằng số trạng thái, interface props.
> Nguyên tắc: **mọi giá trị giao diện chỉ khai báo một lần ở đây**. Component không được viết cứng mã màu, cỡ chữ, bóng đổ.

---

## 0. Cách dùng với project hiện có

Project đã có cấu trúc thư mục riêng — **giữ nguyên**, không tạo thư mục mới hay di chuyển file. Mỗi khối dưới đây chỉ cần đặt vào **file tương ứng đang có** (file token/theme, file CSS nền, file style dùng chung, file hằng số, thư mục component).

Ba nguyên tắc cần giữ dù đặt ở đâu:

- **Token khai báo một lần** (§2); component chỉ dùng tên token.
- **Nhãn trạng thái và câu chữ** (§6–§8) nằm trong file hằng số, không rải trong JSX.
- **CSS parallax** (§5) chỉ import ở trang Marketplace.

---

## 1. Font

`index.html`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Inter:wght@400;500;600&family=Lora:ital,wght@0,600;1,500&display=swap" rel="stylesheet">
```

| Font | Vai trò | Kiểu tải |
|---|---|---|
| Be Vietnam Pro | Thân bài, nhãn, nút, form | 400–800 |
| Inter (`tabular-nums`) | Số và mã trong bảng, trong dòng chữ | 400–600 |
| Lora | `h1`, `h2`, mã định danh làm tiêu đề | **chỉ 600 thường + 500 nghiêng** |

> Không dùng Lora 700: font không tải nên trình duyệt sẽ tự làm đậm giả.

---

## 2. Token (`@theme`)

```css
@import "tailwindcss";

@theme {
  /* ---------- Màu nền ---------- */
  --color-desk: #E8E7E2;          /* mặt bàn: nền trang, topbar, dải header hồ sơ */
  --color-desk-2: #F4F3EF;        /* panel phụ trên mặt bàn */
  --color-paper: #FFFFFF;         /* tờ giấy: card, tài liệu, form, modal */
  --color-sunken: #F7F7F5;        /* vùng lõm bên trong giấy: header bảng, ô chỉ đọc */
  --color-ink: #000000;           /* khung điều hướng, tiêu đề serif, viền "chuyên gia sửa" */
  --color-ink-2: #262624;         /* mục đang chọn trong dải điều hướng đen */

  /* ---------- Chữ ---------- */
  --color-fg-strong: #000000;
  --color-fg: #3A3A38;
  --color-fg-muted: #5A5A56;      /* ≥ 4.5:1 trên cả mặt bàn và giấy */
  --color-fg-disabled: #A3A39F;
  --color-fg-inverse-muted: #A3A39F;

  /* ---------- Viền ---------- */
  --color-border-subtle: #EEEEEC;
  --color-border: #DCDCD9;
  --color-border-control: #83837F;   /* 3.08:1 trên mặt bàn, 3.81:1 trên giấy */
  --color-border-strong: #000000;
  --color-hairline: rgb(38 37 32 / .08);   /* viền tờ giấy, dòng kẻ sổ */

  /* ---------- Cam ---------- */
  --color-accent: #CC4A00;        /* nút primary (≤ 1 mỗi lớp tương tác) */
  --color-accent-hover: #B24100;
  --color-accent-active: #8F2F00;
  --color-accent-text: #B24100;   /* chữ cam: số chú thích [n], nhãn căn cứ */
  --color-accent-soft: #FFF1E8;
  --color-indicator: #E55300;     /* rail, vạch mục chọn, viền ghi chú căn cứ, sợi chỉ */

  /* ---------- Trạng thái ---------- */
  --color-success: #1E7B4F;   --color-success-soft: #E8F5EE;
  --color-warning: #6B5A00;   --color-warning-soft: #FBF3D9;   /* ngả vàng để tách khỏi cam */
  --color-danger:  #C62828;   --color-danger-soft:  #FDECEC;
  --color-ai-border: #83837F;     /* viền nét đứt nội dung AI */

  /* ---------- Thanh ---------- */
  --color-bar: rgb(232 231 226 / .86);  /* topbar dính trên mặt bàn, sau backdrop-blur */
  --color-track: #DCDCD9;               /* rãnh Status Rail, rãnh progress, thumb scrollbar */
  --color-track-fill: #E55300;          /* phần đã đi qua; bằng --color-indicator */

  /* ---------- Font ---------- */
  --font-sans: "Be Vietnam Pro", "Inter", system-ui, sans-serif;
  --font-serif: "Lora", Georgia, serif;
  --font-num: "Inter", system-ui, sans-serif;

  /* ---------- Cỡ chữ (cỡ / line-height) ---------- */
  --text-caption: 0.75rem;        --text-caption--line-height: 1.4;   /* 12 nhãn nhóm, nhãn lề */
  --text-sm: 0.8125rem;           --text-sm--line-height: 1.5;        /* 13 */
  --text-base: 0.9375rem;         --text-base--line-height: 1.6;      /* 15 thân giao diện */
  --text-doc: 1.0625rem;          --text-doc--line-height: 1.75;      /* 17 thân tài liệu */
  --text-h2: 1.25rem;             --text-h2--line-height: 1.4;        /* 20 */
  --text-h1-tool: 1.75rem;        --text-h1-tool--line-height: 1.2;   /* 28 header công cụ */
  --text-h1: 2rem;                --text-h1--line-height: 1.2;        /* 32 */
  --text-case-id: 3.25rem;        --text-case-id--line-height: 1.1;   /* 52 mã hồ sơ */
  --text-hero: 3.75rem;           --text-hero--line-height: 1.08;     /* 60 hero */

  /* ---------- Bo góc ---------- */
  --radius-surface: 4px;          /* tờ giấy, card, khối thông báo */
  --radius-control: 8px;          /* nút, ô nhập, chip */
  --radius-overlay: 12px;         /* modal, popover, toast */

  /* ---------- Bóng ---------- */
  /* Nhuộm rgb(38 37 32) theo sắc mặt bàn. Đen thuần trên nền ấm đọc ra như bẩn. */
  --shadow-paper: 0 1px 2px rgb(38 37 32 / .07), 0 18px 36px -22px rgb(38 37 32 / .30);
  --shadow-overlay: 0 24px 48px -12px rgb(38 37 32 / .28);
  --shadow-control: 0 1px 2px rgb(38 37 32 / .06);            /* ô nhập khi nghỉ */
  --shadow-control-hover: 0 4px 10px -2px rgb(38 37 32 / .12);
  --shadow-pressed: inset 0 1px 2px rgb(38 37 32 / .14);      /* THAY bóng ngoài, không cộng thêm */
  --shadow-accent: 0 2px 6px -1px rgb(143 47 0 / .30), 0 1px 2px rgb(143 47 0 / .18);

  /* ---------- Chuyển động ---------- */
  --ease-out-quint: cubic-bezier(0.22, 1, 0.36, 1);
  --duration-fast: 200ms;
  --duration-base: 320ms;

  /* ---------- Giãn cách ---------- */
  --spacing: 0.25rem;             /* bật thang số của v4: p-1 = 4px, gap-6 = 24px … */

  /* ---------- Breakpoint ---------- */
  --breakpoint-md: 48rem;         /* 768 */
  --breakpoint-lg: 64rem;         /* 1024 */
  --breakpoint-xl: 80rem;         /* 1280 */
}

/* Chiều cao control theo mật độ — dùng: h-control, min-h-control */
:root { --control-h: 44px; }                       /* comfortable: /user */
[data-density="compact"] { --control-h: 36px; }    /* compact: /expert, /admin */

/* Màu vòng focus. Mặc định là mực; bất kỳ vùng nền tối nào chỉ cần đặt lại
   một biến này trên container, không cần thêm selector vào CSS nền.
   Dùng `class="on-ink"` cho khung điều hướng đen, sidebar tối, overlay tối. */
:root { --focus-ring: var(--color-ink); }
.on-ink { --focus-ring: var(--color-paper); }
@theme inline {
  --spacing-control: var(--control-h);
}
```

**Tên utility sinh ra:** `bg-desk`, `bg-paper`, `bg-sunken`, `text-fg-muted`, `text-accent-text`, `border-indicator`, `font-serif`, `font-num`, `text-doc`, `text-case-id`, `rounded-surface`, `rounded-control`, `shadow-paper`, `ease-out-quint`, `h-control`…

---

## 3. CSS nền

```css
@layer base {
  html { color-scheme: light; }

  body {
    @apply bg-desk font-sans text-base text-fg antialiased;
  }

  /* Dòng kẻ sổ: CHỈ vùng nội dung của mặt bàn — không đặt lên topbar/header */
  .desk-content {
    background-image: repeating-linear-gradient(0deg, rgb(38 37 32 / .03) 0 1px, transparent 1px 28px);
  }

  h1, h2 {
    font-family: var(--font-serif);
    font-variant-numeric: lining-nums;
    font-weight: 600;                       /* luôn 600 */
    color: var(--color-fg-strong);
  }

  .num { font-family: var(--font-num); font-variant-numeric: tabular-nums; }

  /* Focus: một treatment cho toàn app.
     - `outline-offset` để trống khoảng cách, nên nền thật phía sau hiện ra và
       vòng focus đọc được trên mặt bàn, trên giấy và trên khung đen như nhau.
       Bản cũ chèn 2px màu mặt bàn làm vòng trong nên trên giấy trắng nó thành
       quầng xám chứ không phải khoảng trống.
     - `outline` tự bám `border-radius` của chính element, nên không khai báo
       lại radius ở đây. Khai báo lại sẽ đổi bo góc của element lúc focus.
     - Lý do quyết định chọn outline thay vì box-shadow: ở chế độ tương phản
       cao của hệ điều hành (forced-colors), box-shadow bị loại bỏ hoàn toàn
       còn outline được giữ và tô lại theo màu hệ thống. Một vòng focus dựng
       bằng box-shadow sẽ biến mất sạch với nhóm người dùng đó. */
  :focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation: none !important;
      transition: none !important;
      scroll-behavior: auto !important;
    }
  }
}
```

---

## 4. Class dùng chung

```css
/* ---------- Tờ giấy ---------- */
@utility paper {
  background: var(--color-paper);
  border: 1px solid var(--color-hairline);
  border-radius: var(--radius-surface);
  box-shadow: var(--shadow-paper);
}
@utility paper-link {
  transition: transform var(--duration-fast) var(--ease-out-quint);
  &:hover { transform: translateY(-2px); }
}

/* ---------- Tài liệu có lề ghi chú ---------- */
@utility doc-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  column-gap: 32px;
  align-items: start;
  @media (width < 64rem) { grid-template-columns: 1fr; row-gap: 8px; }   /* < 1024: ghi chú xuống dưới đoạn */
}
@utility mnote {
  padding: 2px 0 2px 12px;
  border-left: 2px solid;
  display: flex; flex-direction: column; gap: 3px;
  font-size: var(--text-sm); line-height: 1.5;
}
@utility mnote-cite { border-color: var(--color-indicator); }
@utility mnote-ai   { border-left-style: dashed; border-color: var(--color-ai-border); }
@utility mnote-edit { border-color: var(--color-ink); }
@utility mnote-label {
  font-size: var(--text-caption); font-weight: 700;
  letter-spacing: .04em; text-transform: uppercase;    /* 1 trong 2 chỗ được in hoa */
}

/* ---------- Đánh dấu đoạn văn ---------- */
@utility para-ai     { border-left: 2px dashed var(--color-ai-border); padding-left: 16px; }
@utility para-check  { background: var(--color-warning-soft); padding: 12px 16px; border-radius: var(--radius-surface); }
@utility text-revised {
  text-decoration: underline 2px var(--color-indicator);
  text-underline-offset: 4px;
}

/* ---------- Dòng kết luận (thay con dấu) ---------- */
@utility verdict {
  display: inline-flex; flex-direction: column; gap: 2px;
  padding: 2px 0 2px 12px;
  border-left: 3px solid var(--verdict-color, var(--color-ink));
}
@utility verdict-waiting  { --verdict-color: var(--color-indicator); }
@utility verdict-refund   { --verdict-color: var(--color-success); }
@utility verdict-negative { --verdict-color: var(--color-danger); }

/* ---------- Badge AI ---------- */
@utility badge-ai {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 2px 8px; border-radius: var(--radius-surface);
  border: 1px dashed var(--color-ai-border);
  background: var(--color-paper); color: var(--color-fg-muted);
  font-size: var(--text-sm); font-weight: 500;
}

/* ---------- Thanh quyết định (màn công cụ) ---------- */
@utility decision-bar {
  position: sticky; bottom: 0;
  display: flex; align-items: center; gap: 24px;
  padding: 12px 32px;
  background: var(--color-paper);
  border-top: 1px solid var(--color-border);
}

/* ---------- Nút ---------- */
/* Vỏ chung. Chỉ chuyển động màu, bóng và transform, nên không reflow.
   Chiều cao lấy --control-h: 44px ở /user, 36px ở /expert và /admin. */
@utility btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: var(--control-h); padding-inline: 16px;
  border: 1px solid transparent; border-radius: var(--radius-control);
  font-family: var(--font-sans); font-size: var(--text-base); font-weight: 600;
  white-space: nowrap;                    /* nhãn không bao giờ xuống dòng */
  transition: background-color var(--duration-fast) var(--ease-out-quint),
              border-color var(--duration-fast) var(--ease-out-quint),
              box-shadow var(--duration-fast) var(--ease-out-quint),
              transform var(--duration-fast) var(--ease-out-quint);
  &:disabled { pointer-events: none; }
}
/* Nhấn: lùi 1px và đổi sang bóng lõm. Không scale, vì chữ 15px scale sẽ nhòe. */
@utility btn-press {
  &:active { transform: translateY(1px); box-shadow: var(--shadow-pressed); }
}

@utility btn-primary {                    /* tối đa 1 mỗi lớp tương tác */
  background: var(--color-accent); color: var(--color-paper);
  box-shadow: var(--shadow-accent);       /* 4.62:1 — đạt AA mọi cỡ chữ */
  &:hover { background: var(--color-accent-hover); }
  &:active { background: var(--color-accent-active); }
  &:disabled { background: var(--color-desk-2); color: var(--color-fg-disabled); box-shadow: none; }
}
@utility btn-secondary {                  /* viền control, không phải viền thường */
  background: transparent; border-color: var(--color-border-control);
  color: var(--color-fg-strong);
  &:hover { background: var(--color-desk-2); border-color: var(--color-fg-muted); }
  &:disabled { border-color: var(--color-border); color: var(--color-fg-disabled); }
}
@utility btn-ghost {                      /* chỉ dùng cạnh một nút mạnh hơn */
  background: transparent; color: var(--color-fg);
  &:hover { background: var(--color-desk-2); color: var(--color-fg-strong); }
  &:disabled { color: var(--color-fg-disabled); }
}
/* Trên ảnh, cả secondary và ghost đều mất nền. Dùng primary, hoặc lót scrim này. */
@utility btn-on-media {
  background: rgb(38 37 32 / .44); backdrop-filter: blur(6px);
  border-color: rgb(255 255 255 / .28); color: var(--color-paper);
}
/* Đang gửi: giữ màu nghỉ, nhãn về 0 opacity, khoá bề rộng để hàng không nhảy. */
@utility btn-loading { position: relative; color: transparent; pointer-events: none; }

/* ---------- Topbar dính ---------- */
@utility topbar {
  position: sticky; top: 0; z-index: 30;
  height: 64px; display: flex; align-items: center;
  background: var(--color-bar); backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--color-border);
  transition: box-shadow var(--duration-fast) var(--ease-out-quint);
}
/* Qua 8px cuộn: thêm bóng và tăng độ đục. Chỉ đổi đúng thế, nên cảm giác là
   trang chạy dưới thanh chứ không phải thanh tự vẽ lại. */
@utility topbar-scrolled {
  background: var(--color-desk);
  box-shadow: var(--shadow-control);
}

/* ---------- Status Rail (§7) ---------- */
@utility rail { display: flex; align-items: flex-start; gap: 0; }
@utility rail-track {
  flex: 1; height: 2px; margin-top: 7px;
  background: var(--color-track); border-radius: 999px;
}
@utility rail-track-done { background: var(--color-track-fill); }
@utility rail-dot {
  width: 16px; height: 16px; border-radius: 999px;
  border: 2px solid var(--color-track); background: var(--color-paper);
}
@utility rail-dot-done    { border-color: var(--color-track-fill); background: var(--color-track-fill); }
@utility rail-dot-current { border-color: var(--color-track-fill); background: var(--color-paper); }

/* ---------- Progress ---------- */
/* scaleX từ gốc bên trái, không animate width, để giữ trên compositor. */
@utility progress {
  height: 4px; background: var(--color-track);
  border-radius: 999px; overflow: hidden;
}
@utility progress-fill {
  height: 100%; background: var(--color-track-fill);
  border-radius: 999px; transform-origin: left;
  transition: transform var(--duration-base) var(--ease-out-quint);
}

/* ---------- Nhãn nhóm (chỗ thứ 2 được in hoa) ---------- */
@utility eyebrow {
  font-size: var(--text-caption); font-weight: 700;
  letter-spacing: .04em; text-transform: uppercase;
  color: var(--color-fg-muted);
}
```

---

## 5. Parallax — cảnh ghim (chỉ trang Marketplace)

```css
.scene { position: relative; height: 1800px; }
.stage { position: sticky; top: 0; height: 100svh; overflow: hidden; isolation: isolate; }
.lyr   { will-change: transform, opacity; }

/* Trạng thái tĩnh mặc định = trạng thái cuối (không hỗ trợ / giảm chuyển động) */
.card-a { transform: translate(-150px, -40px) rotate(-4deg); }
.card-b { transform: translate(0, 40px); }
.card-c { transform: translate(150px, 120px) rotate(4deg); }
.cap { opacity: 0; } .cap-3 { opacity: 1; }

@supports (animation-timeline: view()) {
  @media (prefers-reduced-motion: no-preference) {
    .scene { view-timeline: --scene block; }
    .sc {
      animation-timeline: --scene;
      animation-range: contain 0% contain 100%;
      animation-fill-mode: both;
      animation-duration: auto;
      animation-timing-function: linear;   /* easing đặt trong từng keyframe */
    }
    .card-a { animation-name: cardA; }
    /* … xem keyframes đầy đủ trong market_px2.py / artboard M1b */
  }
}

@keyframes cardA {
  0%   { transform: translate3d(-8px, -6px, 0) rotate(-2deg); animation-timing-function: var(--ease-out-quint); }
  45%  { transform: translate3d(-150px, -40px, 0) rotate(-4deg); }
  100% { transform: translate3d(-170px, -110px, 0) rotate(-5deg); }
}
```

**Quy tắc:** chỉ animate `transform`/`opacity`; tối đa 4 lớp; lớp trang trí `aria-hidden="true"`; luôn có nút nhảy tới danh sách.
**Trên web thật:** `.scene` nằm trong cuộn của trang (không phải khung cuộn riêng như trên canvas).

---

## 6. Bảng trạng thái — enum → nhãn hiển thị

> Một bảng cho cả hệ thống. Component **không** tự viết nhãn trạng thái.

```ts
export type Tone = 'neutral' | 'accent' | 'warning' | 'success' | 'danger' | 'plain';
//   plain = trạng thái bình thường trong bảng → chữ xám, KHÔNG badge

export interface StatusMeta { label: string; tone: Tone }

/* Flow 1 · Đơn đăng ký Expert */
export const APPLICATION_STATUS = {
  DRAFT:                  { label: 'Bản nháp',              tone: 'neutral' },
  SUBMITTED:              { label: 'Đã nộp',                tone: 'neutral' },
  AI_SCREENING:           { label: 'AI sàng lọc',           tone: 'neutral' },
  NEED_MORE_INFORMATION:  { label: 'Cần bổ sung',           tone: 'warning' },
  NOT_ELIGIBLE:           { label: 'Không đủ điều kiện',    tone: 'danger'  },
  CAPABILITY_REVIEW:      { label: 'Đang đánh giá năng lực', tone: 'accent' },
  APPROVED:               { label: 'Được duyệt',            tone: 'success' },
  REJECTED:               { label: 'Bị từ chối',            tone: 'danger'  },
} as const satisfies Record<string, StatusMeta>;

/* Flow 1 · Dịch vụ Expert (2 trạng thái độc lập) */
export const SERVICE_STATUS = {
  INACTIVE:   { label: 'Chưa hoạt động',                 tone: 'neutral' },
  ACTIVE:     { label: 'Đang hoạt động · hiện trên Marketplace', tone: 'plain' },
  SUSPENDED:  { label: 'Tạm ngưng',                      tone: 'warning' },
} as const satisfies Record<string, StatusMeta>;
export const AVAILABILITY = {
  AVAILABLE:   { label: 'Có lịch nhận việc', tone: 'plain' },
  UNAVAILABLE: { label: 'Hết lịch nhận',     tone: 'neutral' },
} as const satisfies Record<string, StatusMeta>;

/* Flow 2 · Văn bản tri thức */
export const DOCUMENT_STATUS = {
  PENDING:       { label: 'Chờ duyệt',     tone: 'neutral' },
  APPROVED:      { label: 'Đang index',    tone: 'accent'  },
  INDEXED:       { label: 'Đã index',      tone: 'plain'   },
  INDEX_FAILED:  { label: 'Index lỗi',     tone: 'danger'  },
  PARSE_FAILED:  { label: 'Lỗi bóc tách',  tone: 'danger'  },
  REJECTED:      { label: 'Từ chối',       tone: 'danger'  },
  SUPERSEDED:    { label: 'Đã thay thế',   tone: 'plain'   },
} as const satisfies Record<string, StatusMeta>;

/* Flow 5 · Hồ sơ rà soát (case) */
export const CASE_STATUS = {
  PENDING_EXPERT_RESPONSE:    { label: 'Chờ chuyên gia nhận',  tone: 'neutral' },
  AWAITING_PAYMENT:           { label: 'Chờ thanh toán',       tone: 'warning' },
  CANCELLED_UNPAID:           { label: 'Đã hủy · chưa thanh toán', tone: 'plain' },
  PAYMENT_CONFIRMED:          { label: 'Chờ bắt đầu rà soát',  tone: 'neutral' },
  EXPERT_TIMEOUT:             { label: 'Đã hủy · hoàn tiền',   tone: 'plain'   },
  IN_REVIEW:                  { label: 'Đang rà soát',         tone: 'accent'  },
  AWAITING_USER_INFORMATION:  { label: 'Chờ bạn bổ sung',      tone: 'warning' },
  AWAITING_ACCEPTANCE:        { label: 'Chờ nghiệm thu',       tone: 'warning' },
  DISPUTED:                   { label: 'Đang tranh chấp',      tone: 'warning' },
  COMPLETED:                  { label: 'Hoàn tất',             tone: 'success' },
  AUTO_CONFIRMED:             { label: 'Hoàn tất · tự xác nhận', tone: 'success' },
  TERMINATED:                 { label: 'Đã chấm dứt',          tone: 'neutral' },
} as const satisfies Record<string, StatusMeta>;

export const REVIEW_RESULT = {
  VERIFIED:       { label: 'Đã xác thực',        tone: 'success' },
  CANNOT_VERIFY:  { label: 'Không thể xác thực', tone: 'danger'  },
} as const satisfies Record<string, StatusMeta>;

/* Kết luận → kiểu dòng kết luận */
export type VerdictKind = 'final' | 'waiting' | 'refund' | 'negative';
```

---

## 7. Các bước Status Rail

```ts
export const RAIL_APPLICATION = ['Nộp hồ sơ', 'AI sàng lọc', 'Kiểm tra giấy tờ pháp lý', 'Đánh giá năng lực', 'Kết quả'] as const;
export const RAIL_DOCUMENT    = ['Thu thập', 'Kiểm tra phiên bản', 'Bóc tách', 'Rà soát', 'Index'] as const;
export const RAIL_DRAFT       = ['Mẫu biểu', 'Nhập liệu', 'Xác nhận snapshot', 'Tạo nháp', 'Xem trước'] as const;
export const RAIL_CASE_CLIENT = ['Chuyên gia nhận', 'Thanh toán', 'Bắt đầu rà soát', 'Rà soát', 'Nghiệm thu'] as const;
export const RAIL_CASE_EXPERT = ['Yêu cầu mới', 'Chờ thanh toán', 'Bắt đầu rà soát', 'Rà soát', 'Nghiệm thu'] as const;
export const TRACE_ANSWER     = ['Kiểm tra phạm vi', 'Tìm văn bản pháp lý', 'Soạn câu trả lời'] as const;

/* Ánh xạ trạng thái case → bước hiện tại trên rail Client */
export const CASE_RAIL_STEP: Record<keyof typeof typeof CASE_STATUS, number> = {
  PENDING_EXPERT_RESPONSE: 0, AWAITING_PAYMENT: 1, CANCELLED_UNPAID: 1,
  PAYMENT_CONFIRMED: 2, EXPERT_TIMEOUT: 2,
  IN_REVIEW: 3, AWAITING_USER_INFORMATION: 3,
  AWAITING_ACCEPTANCE: 4, DISPUTED: 4,
  COMPLETED: 5, AUTO_CONFIRMED: 5, TERMINATED: 3,
};
```

---

## 8. Câu chữ cố định

```ts
export const COPY = {
  aiDraftDisclaimer:  'Nội dung do AI tạo, chưa được chuyên gia xác thực.',
  aiAnswerNote:       'Câu trả lời do AI tạo từ văn bản pháp lý đã duyệt; không thay thế ý kiến chuyên gia cho hồ sơ cụ thể.',
  aiScreeningNote:    'Gợi ý để xem xét, không phải quyết định.',
  creditHold:         'Mỗi câu hỏi giữ tạm 1 credit, chỉ trừ khi trả lời thành công',
  exportCredit:       'Tải về dùng ngay · 1 credit',
  escrowClient:       'Khoản thanh toán được SHFT giữ hộ tới khi bạn nghiệm thu.',
  noChatForExpert:    'Chuyên gia không xem được lịch sử trò chuyện với trợ lý AI.',
  snapshotImmutable:  'Snapshot không sửa được sau khi tạo. Muốn thay đổi, bạn sửa form và xác nhận lại.',
} as const;
```

> Client **không** được thấy tỷ lệ 80/20 hay phí nền tảng — không đưa các con số này vào `COPY` phía Client.

---

## 9. Component — interface props

```ts
/* Status Rail lớn (header hồ sơ) hoặc gọn (header công cụ) */
interface StatusRailProps {
  steps: readonly string[];
  current: number;                 // > steps.length - 1 = đã xong hết
  size?: 'lg' | 'sm';              // lg: header hồ sơ · sm: header công cụ
  dates?: (string | null)[];       // mốc thời gian dưới mỗi nhãn (chỉ lg)
  currentNote?: { text: string; tone: 'warning' | 'danger' };
}

/* Header — chọn đúng loại, KHÔNG truyền badge nếu đã có rail */
interface CaseHeaderProps { code: string; title: string; meta: [label: string, value: string][]; rail: StatusRailProps }
interface ToolHeaderProps { code: string; subtitle: string; rail: StatusRailProps }

/* Lề ghi chú */
type MarginNoteKind = 'cite' | 'ai' | 'edit';
interface MarginNoteProps {
  kind: MarginNoteKind;
  label: string;                   // vd. "[1] CĂN CỨ", "AI · CẦN XEM LẠI"
  children: React.ReactNode;
  action?: { label: string; onClick: () => void };   // "Xem trích đoạn", "Đánh dấu đã xem xét"
}
interface DocRowProps {
  paragraph: React.ReactNode;
  note?: React.ReactElement<MarginNoteProps>;         // tự gắn aria-describedby
}
type NoteScope = 'paragraph' | 'page';                // PDF gốc → 'page'

/* Dòng kết luận */
interface VerdictProps { title: string; by?: string; at?: string; kind: VerdictKind }

/* Dấu vết xử lý câu trả lời AI */
type TraceState = 'done' | 'current' | 'todo' | 'stop';
interface AnswerTraceProps { steps: { label: string; state: TraceState }[] }

/* Thanh quyết định */
interface DecisionBarProps {
  blockers: { text: string; tone?: 'neutral' | 'warning' }[];   // lý do primary bị khóa
  secondary?: React.ReactNode;
  danger?: React.ReactNode;
  primary: { label: string; onClick: () => void; disabled?: boolean };
}
```

---

## 10. Checklist review PR giao diện

- [ ] Không có mã màu, cỡ chữ, bóng đổ viết cứng trong component (chỉ dùng token §2)
- [ ] Mỗi lớp tương tác (trang / modal) có **tối đa 1** nút `bg-accent`
- [ ] Header có rail thì **không** có badge trạng thái
- [ ] Màn công cụ dùng `ToolHeader` + `DecisionBar`; cột chữ tài liệu ≥ 420px
- [ ] Trạng thái lấy từ bảng trạng thái (§6); trạng thái `plain` hiển thị chữ xám, không badge
- [ ] Nội dung AI có `badge-ai` hoặc `para-ai`; không hiển thị số AI tự tính
- [ ] Căn cứ pháp lý có kỳ áp dụng; ghi chú lề có `aria-describedby`
- [ ] Chữ in hoa chỉ ở `mnote-label`, `eyebrow`, nội dung văn bản pháp lý, dữ liệu theo quy ước
- [ ] `h1`/`h2` không đặt `font-weight` khác 600
- [ ] Không con dấu, không ảnh nền, không gradient trang trí
- [ ] Animation chỉ `transform`/`opacity`, có nhánh `prefers-reduced-motion`
- [ ] Không có ghi chú cho dev hiển thị trên giao diện
- [ ] Ô nhập và nút viền dùng `border-control`, không dùng `border`; chúng là ranh giới của control nên phải đạt 3:1
- [ ] Bóng đổ lấy từ `--shadow-*`; không có `rgb(0 0 0 / …)` viết cứng trong component
- [ ] Nhãn nút vừa một dòng ở desktop; một ý định chỉ có một nhãn trên toàn trang

---

## 11. Nhịp giãn cách

Thang số của Tailwind v4 đã bật qua `--spacing: 0.25rem`, nên `p-1` là 4px, `gap-6` là 24px.
Phần cần thống nhất không phải thang mà là **nhịp**: mỗi khoảng cách là bậc kế tiếp của khoảng
nằm bên trong nó. Đó là thứ giữ cho các nhóm đọc được mà không cần vẽ khung quanh chúng.

| Quan hệ | Khoảng | Class |
|---|---|---|
| Nhãn đến ô nhập của nó | 8 | `gap-2` |
| Ô nhập đến chữ phụ trợ hoặc chữ lỗi | 6 | `mt-1.5` |
| Ô nhập đến ô nhập kế tiếp | 20 | `space-y-5` |
| Tiêu đề đến đoạn thân bài | 12 | `mt-3` |
| Thân bài đến nút | 24 | `mt-6` |
| Padding trong tờ giấy | 20 mobile, 24 desktop | `p-5 md:p-6` |
| Gap giữa các tờ giấy trong lưới | 16 mobile, 24 desktop | `gap-4 md:gap-6` |
| Khối con đến khối con trong một mục | 48 | `space-y-12` |
| Padding dọc của một mục | 64 ở `/user`, 48 ở `/expert` và `/admin` | `py-16` / `py-12` |
| Lề trang | 16 dưới 768, 24 đến 1024, 32 trên 1024 | `px-4 md:px-6 lg:px-8` |

`doc-row` đã cố định `column-gap: 32px` và lề ghi chú 220px, giữ nguyên.

Một luật quang học đi kèm: **padding trong một tờ giấy ít nhất bằng gap quanh nó.** Nếu nhỏ hơn,
các tờ giấy chen vào nhau trong khi bên trong lại trống.

---

## 12. Những gì vừa đổi so với bản trước

Tên token không đổi dòng nào, nên không component nào cần sửa theo. Chỉ giá trị thay đổi, cộng
một số token mới.

| Token | Trước | Sau | Lý do |
|---|---|---|---|
| `--color-border-control` | `#8A8A86` | `#83837F` | Bản cũ đạt 3.46:1 trên giấy nhưng chỉ **2.80:1 trên mặt bàn**, nên một ô nhập đặt trực tiếp lên mặt bàn không đạt 3:1 của WCAG 1.4.11. Viền là thứ duy nhất cho biết đó là một ô nhập. Bản mới: 3.08:1 trên mặt bàn, 3.81:1 trên giấy. |
| `--color-warning` | `#8A5A00` | `#6B5A00` | Nâu-cam cũ gần như không phân biệt được với `--color-accent-text` `#B24100`. Trên một giao diện mà cam nghĩa là "hành động" và "căn cứ", một cảnh báo cùng sắc là nhập nhằng thật. Bản mới ngả vàng-ô-liu, tách rõ bằng sắc chứ không chỉ bằng độ sáng. 6.80:1 trên giấy. |
| `--color-warning-soft` | `#FFF6E0` | `#FBF3D9` | Theo `--color-warning`, và để tách khỏi `--color-accent-soft` `#FFF1E8`. |
| `--color-ai-border` | `#8A8A86` | `#83837F` | Đồng bộ với `border-control`; nét đứt AI cũng là một ranh giới cần đọc được. |
| `--shadow-paper`, `--shadow-overlay` | `rgb(0 0 0 / …)` | `rgb(38 37 32 / …)` | Bóng đen thuần trên mặt bàn ấm `#E8E7E2` đọc ra như bẩn. Nhuộm theo sắc nền thì vẫn là cùng độ sâu nhưng sạch. Độ mờ nhích nhẹ để bù phần sáng vừa thêm. |

Token mới, cộng thêm nên không phá gì:

- `--color-hairline` thay cho `rgb(0 0 0 / .06)` từng viết cứng trong `paper`, và dòng kẻ sổ của `desk-content` cũng nhuộm ấm theo.
- `--color-bar`, `--color-track`, `--color-track-fill` cho topbar dính, Status Rail và progress.
- `--shadow-control`, `--shadow-control-hover`, `--shadow-pressed`, `--shadow-accent`. Bậc control trước đây thiếu, nên ô nhập và nút không có bóng nào để dùng ngoài `shadow-paper` vốn dành cho tờ giấy.
- `--spacing: 0.25rem` bật thang số v4, kèm bảng nhịp ở §11.

Sửa trong CSS nền và class dùng chung:

- **`:focus-visible`** chuyển từ `box-shadow` vòng kép sang `outline` cộng `outline-offset`. Bản cũ chèn 2px màu mặt bàn làm vòng trong, nên trên một tờ giấy trắng nó thành quầng xám chứ không phải khoảng trống. `outline-offset` để trống khoảng cách nên nền thật hiện ra, một treatment chạy đúng trên cả ba nền. Lý do quyết định: ở chế độ tương phản cao của hệ điều hành, `box-shadow` bị loại bỏ hoàn toàn còn `outline` được giữ và tô lại theo màu hệ thống, nên vòng focus dựng bằng `box-shadow` sẽ biến mất sạch với nhóm người dùng đó. Màu vòng lấy từ token `--focus-ring`; vùng nền tối chỉ cần thêm `class="on-ink"` lên container, không sửa CSS nền.
- **Nút** giờ có utility: `btn` cộng `btn-primary` / `btn-secondary` / `btn-ghost`, cộng `btn-press`, `btn-on-media`, `btn-loading`. Trước đây §10 yêu cầu "tối đa 1 nút `bg-accent`" nhưng nút chưa từng được định nghĩa ở đâu, nên mỗi người sẽ tự dựng bằng utility rời, trái với nguyên tắc "mọi giá trị khai báo một lần" ở đầu file. Chiều cao lấy `--control-h` nên tự theo mật độ.
- **Thanh** giờ có `topbar` / `topbar-scrolled`, `rail` và `progress`. `decision-bar` giữ nguyên.

Một điểm **cố ý không đổi**: `--color-ink: #000000`, `--color-fg-strong: #000000` và
`--color-border-strong: #000000` vẫn là đen thuần. Đen thuần thường nên tránh, nhưng khung điều
hướng đen trên mặt bàn ấm là một lựa chọn nhận diện của SHFT, không phải mặc định bỏ sót, nên giữ.
Bóng đổ thì đã nhuộm ấm, vì bóng không mang nhận diện.
