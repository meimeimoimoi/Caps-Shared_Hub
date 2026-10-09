# DESIGN — Trang Marketplace "Sàn Chuyên gia"

Tài liệu thiết kế cho trang marketplace (danh sách và lọc chuyên gia đã qua 2 cổng thẩm định), kế thừa trực tiếp ngôn ngữ thị giác của homepage (`FE/src/pages/home/`). Mọi giá trị dưới đây lấy từ `homepage.css` và `homepage-scripts.ts`; khi có xung đột, ưu tiên homepage.

---

## 1. Mục tiêu và nguyên tắc

**Mục tiêu:** giúp doanh nghiệp/kế toán tìm đúng chuyên gia thuế TNDN, so sánh nhanh (lĩnh vực, kinh nghiệm, đánh giá, phí) và đi tới "Đặt lịch" hoặc "Xem hồ sơ".

**Nguyên tắc kế thừa từ homepage:**

1. **AI-First, Human-Verified.** Chuyên gia là lớp xác thực, nên mỗi hồ sơ phải hiện rõ trạng thái đã qua thẩm định (nhãn `Verified`/ shield), không chỉ là ảnh và tên.
2. **Tin cậy trước trang trí.** Nền sáng/tối phẳng, bo góc lớn, viền mảnh `--line`, bóng nhẹ. Gradient chỉ dùng cho logo, hero và nhấn mạnh tiêu đề.
3. **Cam là màu hành động.** `--br`/`--brd` dành cho CTA chính và trạng thái focus/hover. Xanh lá `--ver` chỉ cho trạng thái đã xác thực. Không dùng cam làm màu nền lớn của thẻ.
4. **Dữ liệu rõ ràng.** Số liệu (đánh giá, năm kinh nghiệm, phí) dùng chữ đậm, `tabular-nums` khi là con số so sánh.
5. **Nội dung tiếng Việt, có dấu.** Mọi nhãn UI, placeholder và thông báo đều tiếng Việt.

---

## 2. Màu sắc (design tokens)

Trang marketplace dùng cùng bộ token scope `#shub-home` như homepage (nền public, không dùng `theme.css` của app shell). Chọn theme qua `useTheme()` (`data-theme` trên `html`, fallback `prefers-color-scheme`).

### 2.1 Light

| Token | Giá trị | Vai trò |
|---|---|---|
| `--bg` | `#FFFFFF` | Nền trang, header (82% opacity + blur) |
| `--bg2` | `#F8FAFC` | Nền dải xen kẽ, nền chip/khối phụ |
| `--surf` | `#FFFFFF` | Nền thẻ chuyên gia, ô tìm kiếm, modal |
| `--ink` | `#0F172A` | Tiêu đề, tên chuyên gia, giá |
| `--mut` | `#475569` | Văn bản thường, mô tả |
| `--line` | `#E2E8F0` | Viền thẻ, divider, viền chip |
| `--br` | `#EA580C` | Viền hover/focus, icon nhấn |
| `--brd` | `#C2410C` | Nền nút primary |
| `--brt` | `#C2410C` | Chữ link/nhãn nhấn |
| `--brl` | `#FFF7ED` | Nền nhãn cam nhạt |
| `--ver` | `#047857` | Verified, nhãn đã thẩm định |
| `--verbg` | `#ECFDF5` | Nền nhãn Verified |
| `--dr` | `#1D4ED8` | Nhãn "Dự án/Dữ liệu" (`.ch.d`) |
| `--drbg` | `#EFF6FF` | Nền nhãn `.ch.d` |
| `--rev` | `#B45309` | Chờ rà soát |
| `--revbg` | `#FFFBEB` | Nền nhãn chờ |

### 2.2 Dark

| Token | Giá trị |
|---|---|
| `--bg` | `#0F172A` |
| `--bg2` | `#0B1220` |
| `--surf` | `#1E293B` |
| `--ink` | `#F8FAFC` |
| `--mut` | `#94A3B8` |
| `--line` | `#334155` |
| `--brt` | `#FB923C` (chữ cam sáng hơn để đủ tương phản) |
| `--brl` | `rgba(234,88,12,.14)` |
| `--ver` | `#34D399` |
| `--verbg` | `rgba(52,211,153,.12)` |
| `--dr` | `#60A5FA` |
| `--rev` | `#FBBF24` |

`--brd` (`#C2410C`) giữ nguyên ở dark; nút primary vẫn có chữ trắng.

### 2.3 Màu avatar chuyên gia

Mỗi chuyên gia có màu riêng qua `--c` (dùng cho avatar chữ cái và `.ea`). Bảng màu lấy từ flow và các cột cùng họ với homepage, không thêm màu ngoài bảng:

`#C2410C` · `#2563EB` · `#047857` · `#B45309` (có thể mở rộng bằng cùng họ đậm vừa, tối thiểu 4.5:1 với chữ trắng).

Quy tắc: chữ trắng trên avatar, bóng viền `0 0 0 3px var(--surf)` tạo khoảng tách.

---

## 3. Typography

| Vai trò | Font | Kích thước / lineheight | Trọng số | Ghi chú |
|---|---|---|---|---|
| Body | `Inter, system-ui, sans-serif` | 16px / 1.65 | 400 | `-webkit-font-smoothing: antialiased` |
| H1 trang | Inter | `clamp(2.35rem, 4.4vw, 4.1rem)` / 1.08 | 800 | `letter-spacing: -.03em`, tối đa 15ch |
| H2 section | Inter | `clamp(2rem, 4vw, 3rem)` / 1.08 | 800 | `letter-spacing: -.03em` |
| H3 | Inter | 24–28px / 1.08 | 800 | Tên thẻ lớn |
| Tên chuyên gia (H4 / `.en`) | Inter | 18–19px | 800 | Màu `--ink`, hover `--brt` |
| Nhãn vai trò (`.er`) | Inter | 12px | 700 | UPPERCASE, `letter-spacing: .04em`, màu `--brt` |
| Mô tả | Inter | 14px | 400 | Màu `--mut` |
| Subtitle section (`.head p`) | Inter | 18px | 400 | Tối đa 640px |
| Giá (`.pr strong`) | Inter | 22px | 800 | `-.02em` |
| Nhãn nhỏ (`.lb`, `.ch`) | Inter | 11–12px | 600–700 | Dùng UPPERCASE chỉ với `.lb`/`.er` |
| Trích dẫn / nội dung hồ sơ | Merriweather, Georgia, serif | 14.5–15.5px / 1.8 | 400 | Chỉ dùng cho nội dung chuyên môn dài, không dùng cho tên hay giá |

**Lưu ý:** cần xác nhận Inter và Merriweather đã được nạp (Google Fonts) trong `index.html`; nếu chưa, fallback về hệ thống.

---

## 4. Lưới, khoảng cách và bo góc

- **Container:** `max-width: 1200px`, padding ngang `24px` (`.w`).
- **Section:** padding dọc `88px` (desktop), `64px` (≤900px). Nền xen kẽ bằng `--bg2` kèm viền trên/dưới `--line`.
- **Spacing:** bội số 4/8. Khoảng cách chuẩn giữa các thẻ: `20px`–`24px`. Khoảng giữa tiêu đề và nội dung: `48px` (`.head`).
- **Bo góc:**
  - Thẻ chuyên gia `22px` (`.ec`, `.xc`)
  - Thẻ lớn/card `26px`
  - Ô input / ask bar `20px`
  - Nút và ô icon `12px`
  - Chip/pill `99px`
- **Đổ bóng:**
  - Mặc định: không bóng (phẳng)
  - Hover thẻ: `0 26px 44px -30px rgba(234,88,12,.4)`
  - Nút primary: `0 10px 26px -10px rgba(234,88,12,.7)`
  - Header: không bóng, chỉ viền dưới `--line`.

---

## 5. Cấu trúc trang

Thứ tự section trên trang, theo đúng anchor `#marketplace` của homepage:

```
Header (sticky, 68px, blur)
Main
  1. Page head      — tiêu đề "Sàn Chuyên gia", mô tả, link phụ bên phải
  2. Toolbar        — ô tìm kiếm + bộ lọc chip vai trò + sắp xếp
  3. Kết quả        — số lượng kết quả + lưới thẻ chuyên gia (.ex)
  4. Phân trang     — (hoặc "Tải thêm" trên mobile)
  5. Ghi chú        — "Dữ liệu minh họa..." khi dùng mock
Footer (nền #0F172A, dùng chung)
```

### 5.1 Page head

- Bố cục: flex, `justify-content: space-between`, `align-items: end`, `flex-wrap: wrap`, `gap: 16px`.
- Trái: H2 "Sàn Chuyên gia" + đoạn mô tả (`max-width: 620px`).
- Phải: link `.lnk` "Xem toàn bộ Sàn Chuyên gia →" (chỉ hiển thị ở trang chủ; ở trang marketplace có thể thay bằng số kết quả).
- Trên mobile: link xuống dưới tiêu đề.

### 5.2 Toolbar

- **Ô tìm kiếm:** cùng style `.ask` (nền `--surf`, viền `--line`, bo `20px`, focus đổi viền sang `--br` và thêm vòng `rgba(234,88,12,.18)`). Icon `i-search` màu `--br`. Placeholder: "Tìm theo tên, lĩnh vực hoặc kinh nghiệm…".
- **Chip lọc vai trò (`.fl`):** `Tất cả` · `Đại lý thuế` · `Kế toán trưởng` · `Chuyên gia pháp lý` (có thể thêm lọc theo lĩnh vực/giá).
  - Chip thường: nền `--surf`, viền `--line`, chữ `--mut`, pill 99px, padding `9px 18px`, 14px/600.
  - Chip đang chọn (`.on`): nền `--ink`, chữ `--bg`, viền `--ink` (đảo màu so với nền, không dùng cam).
  - Hover: đổi viền/chữ về `--br`/`--brt` (chỉ khi không chọn).
- **Sắp xếp:** select tùy chỉnh (`custom-select.tsx`) theo thứ tự: Đánh giá cao, Kinh nghiệm, Phí thấp → cao.
- Trên mobile: ô tìm kiếm full-width; chip cuộn ngang nếu vượt chiều rộng (`overflow-x: auto`, ẩn scrollbar) — không xuống dòng quá 2 hàng.

### 5.3 Lưới kết quả (`.ex`)

| Breakpoint | Số cột | Gap |
|---|---|---|
| ≥ 901px | 4 | 20px |
| 561–900px | 2 | 20px |
| ≤ 560px | 1 | 20px |

Thẻ cùng chiều cao trong một hàng (`grid` mặc định). Nội dung thẻ căn trên, phần giá/nút (`.ef`) đẩy xuống dưới bằng `margin-top: auto`.

---

## 6. Thẻ chuyên gia (`.ec`) — thành phần chính

Cấu trúc, từ trên xuống:

```
.ec  (nền --surf, viền --line, bo 22px, padding 24px, flex column, gap 16px)
├─ .eh  (flex, gap 16px, align center)
│   ├─ .ea   Avatar tròn 68px, chữ cái trắng 24px/800, nền --c,
│   │        vòng tách 3px --surf + vòng 5px --line, chấm xanh online 14px góc dưới phải
│   └─ div
│       ├─ .en   Tên (19px/800) + icon shield xanh --ver 18px
│       ├─ .er   Vai trò (12px UPPERCASE, --brt)
│       └─ .es   Chức danh/đơn vị · N năm KN (13px, --mut)
├─ .rt   Đánh giá: icon star vàng #F59E0B + "4.9" đậm + "(xx đánh giá)"; nền --brl, bo 12px, padding 8px 14px
├─ .lb   "Chuyên sâu năng lực:" (11px/700 UPPERCASE)
│   .tg  Các tag: 12px, nền --bg2, viền --line, pill, padding 3px 10px
└─ .ef   (border-top --line, padding-top 16px, margin-top auto, flex wrap, space-between)
    ├─ .pr   "Phí tư vấn" (12px) · giá 22px/800 "1.500.000đ" · "/60 phút" (13px)
    └─ .eb   Nút "Hồ sơ" (.btn.o, viền --line) + "Đặt lịch ngay" (.btn.p)
```

**Quy tắc:**

- **Tên** luôn kèm icon shield khi chuyên gia đã qua cổng 2 (năng lực). Nếu chỉ qua cổng 1 (pháp lý) thì không hiển thị shield và không gọi là "Verified".
- **Đánh giá:** hiển thị 1 chữ số thập phân. Khi chưa có đánh giá, hiển thị "Chưa có đánh giá" thay cho số 0.
- **Số năm kinh nghiệm** là số nguyên, dạng "10 năm KN".
- **Giá:** định dạng `1.500.000đ`, đơn vị thời lượng ghi rõ (`/60 phút`). Không hiển thị giá trị âm hoặc để trống.
- **Tag:** tối đa 3 tag/thẻ, dài quá thì cắt bằng "+N".
- **Hover thẻ:** `translateY(-4px)`, viền `--br`, bóng cam nhạt. Chuyển đổi `.3s`.
- **Hover avatar:** vòng ngoài đổi từ `--line` sang `--br`.
- **Dấu chấm online** (`.ea:after`): chỉ hiển thị khi chuyên gia đang nhận việc.

### 6.1 Hành vi nút

| Nút | Kiểu | Hành động |
|---|---|---|
| Hồ sơ | `.btn.o` (ghost, viền `--line`) | Mở modal hồ sơ (`.mo`/`.md`) |
| Đặt lịch ngay | `.btn.p` (cam, bóng) | Điều hướng đến đặt lịch (cần đăng nhập) |
| Tên / avatar | Mở modal hồ sơ | Cùng hành vi với "Hồ sơ" |

Trạng thái: hover nút primary đổi `--brd` → `#9A3412` và nâng `translateY(-2px)`. Focus-visible phải có viền rõ (dùng `--br`).

---

## 7. Hồ sơ chi tiết (modal `.mo` / `.md`)

- Overlay: `rgba(15,23,42,.62)` + `backdrop-filter: blur(6px)`, z-index 100.
- Hộp: `max-width: 680px`, bo `24px`, nền `--brl`, viền `--line`, đổ bóng sâu. Animation `pop` 0.3s.
- Thanh tiêu đề (`.mt`): nền `#0F172A` cố định (không đổi theo theme), chữ trắng 12px UPPERCASE, chấm xanh `#10B981`, nút đóng `i-x`.
- Nội dung (`.mb`): nền `--bg2`, các khối `.mc` (nền `--surf`, bo 18px). Mỗi khối có tiêu đề 15px/700 với icon `--br`.
- Khối giá (`.mp`/`.mf`): giá 26px/800.
- Chọn gói/dịch vụ (`.sv`): dạng radio card, 2 cột, chọn bằng viền `--br` và chấm tròn `.rd` `--br`. Giá đã chọn hiển thị pill `.pk` nền `--brd`, chữ trắng.
- Footer (`.mx`): nền `--surf`, bên trái thông tin phí/hoàn tiền (icon `--ver`), bên phải nút xác nhận.
- Mobile (≤560px): modal thành bottom sheet — `align-items: flex-end`, bo trên 24px, `max-height: 94%`, bỏ padding ngoài.
- Đóng bằng nút X, phím `Esc`, và click overlay. Khóa scroll body khi mở; trả focus về nút đã mở khi đóng.

---

## 8. Trạng thái (states)

| Trạng thái | Hiển thị |
|---|---|
| **Loading** | Lưới 4 thẻ skeleton: khối tròn 68px + 3 dòng `.sk i` (9px, bo 5px, gradient `--line`→trong suốt). Không dùng spinner toàn trang. |
| **Có kết quả** | Lưới như mục 5.3 |
| **Không có kết quả** | Một thẻ rộng (`.ec` không viền) với icon `i-search`, tiêu đề "Chưa có chuyên gia phù hợp", gợi ý "Thử bỏ bộ lọc" + nút `.btn.o` xóa lọc |
| **Lỗi tải** | Thông báo `--danger`/`--danger-soft` (từ `theme.css` tokens cùng họ) + nút "Thử lại" |
| **Dữ liệu minh họa** | Dòng `.demo` căn giữa, italic 12px, opacity .8: "Dữ liệu minh họa, hồ sơ chuyên gia thật sẽ thay thế." |

---

## 9. Chuyển động

- **Reveal khi cuộn (`.rv`):** `opacity 0→1`, `translateY 20px→0`, `.7s cubic-bezier(.2,.7,.2,1)`. Chỉ áp dụng khi có class `js` trên root. Mỗi thẻ trong lưới có thể delay tăng dần 40–60ms, tối đa 4 bước.
- **Hover:** `.3s` cho thẻ, `.2s` cho chip và link. Không dùng animation lặp vô hạn trong lưới kết quả.
- **Chỉ dùng animation nền (drift, spin, bob) trên hero homepage.** Trang marketplace không lặp animation.
- **Reduced motion:** `prefers-reduced-motion: reduce` tắt transform và transition của `.rv`, hiển thị ngay.
- **Đổi theme:** `background` và `color` chuyển `.4s`.

---

## 10. Responsive

| Breakpoint | Thay đổi |
|---|---|
| ≥ 1025px | Lưới 4 cột, nav đầy đủ |
| 901–1024px | Lưới 4 cột, nav đầy đủ |
| ≤ 900px | Nav ẩn, hiện nút menu (`.ib.menu`); menu mở dạng dropdown full-width dưới header; lưới 2 cột; section padding 64px |
| ≤ 768px | Stage/hero đổi bố cục; không ảnh hưởng marketplace |
| ≤ 560px | Lưới 1 cột; ô tìm kiếm xuống dòng; nút `.btn.g` ẩn; `.btn.p` full-width trong ask bar |

Yêu cầu chung: **không cuộn ngang** trên màn 375px, lề hai bên 16px trên điểm chạm nhỏ (homepage đang dùng 24px ở `.w`; trên mobile có thể giảm xuống 16px nếu nội dung cần chỗ).

**Vùng chạm:** mọi nút/chip tối thiểu 40×40px. Icon `.ib` đã là 40×40.

---

## 11. Icon

Dùng SVG sprite `<symbol>` (stroke 2, `stroke-linecap/linejoin: round`, viewBox 24). Class `.i` đặt kích thước 20px. Bộ icon đang có và dùng được trên marketplace:

| Icon | Dùng cho |
|---|---|
| `i-shield` | Xác thực, logo, tên đã Verified |
| `i-search` | Ô tìm kiếm |
| `i-star` | Đánh giá (màu vàng `#F59E0B`) |
| `i-users` | Vai trò/chuyên gia |
| `i-award` | Chuyên gia pháp lý/nổi bật |
| `i-build` | Đại lý thuế/doanh nghiệp |
| `i-arrow` | Link và CTA |
| `i-cal` | Đặt lịch |
| `i-lock` | Escrow/thanh toán an toàn |
| `i-eye` | Rà soát |
| `i-x`, `i-menu` | Đóng modal, menu |
| `i-sun` / `i-moon` | Đổi theme |

---

## 12. Khả năng tiếp cận (a11y)

- **Tương phản:** chữ thường tối thiểu 4.5:1, chữ lớn 3:1. Kiểm tra cặp `--brt` trên `--brl` và `--ver` trên `--verbg` ở cả hai theme.
- **Focus:** mọi phần tử tương tác có `:focus-visible` rõ (viền 2px `--br` hoặc vòng `0 0 0 3px rgba(234,88,12,.25)`).
- **Ngữ nghĩa:**
  - Lưới kết quả dùng `<ul>/<li>` hoặc `role="list"`.
  - Chip lọc dùng `aria-pressed` (hoặc `role="radiogroup"` nếu chỉ chọn một).
  - Ô tìm kiếm có `aria-label`; avatar chữ cái có `aria-label` là tên đầy đủ.
  - Modal: `role="dialog"`, `aria-modal="true"`, `aria-labelledby` trỏ đến tên chuyên gia.
- **Chữ trong avatar:** không dùng là thông tin duy nhất; tên luôn hiển thị bên cạnh.
- **Màu không phải tín hiệu duy nhất:** Verified có cả icon shield và chữ "Verified", không chỉ màu xanh.
- **Chấm online** có `aria-label="Đang nhận việc"` nếu hiển thị bằng phần tử riêng.

---

## 13. Tích hợp và quy ước code

- **Scope CSS:** dùng cùng quy tắc `#shub-home` của homepage, hoặc đặt root riêng (ví dụ `#shub-market`) và copy đúng token. Không viết rule ngoài scope. Tham khảo `FE/docs/HOMEPAGE.md` trước khi thêm CSS mới.
- **Component dùng lại:** `Button` (`components/ui/actions/button.tsx`), `Input`/`CustomSelect` (`components/ui/forms/`), `Modal` (`components/ui/feedback/modal.tsx`), `Pagination` (`components/ui/navigation/pagination.tsx`), `Badge`/`StatusBadge` (`components/ui/display/`).
- **Dữ liệu:** thay mảng mock `X` trong `homepage-scripts.ts` bằng API. Chuẩn kiểu `Expert` hiện có (`n, r, i, c, y, s, p, t`) làm mẫu cho model; `c` là màu avatar, `t` là danh sách tag.
- **Theme:** dùng `useTheme()`; không hard-code màu ngoài token, trừ màu cố định của modal header `.mt` và footer.
- **i18n:** chuỗi UI đi qua file i18n (xem `docs/I18N.md`), không hard-code tiếng Việt trong JSX mới.
- **Motion:** tuân theo `docs/MOTION.md`.

---

## 14. Nội dung và pháp lý

- Mọi thẻ chuyên gia phải có cảnh báo hoặc link đến điều khoản khi hiển thị thông tin tư vấn.
- Không ghi "tư vấn pháp lý chính thức" thay cho chuyên gia; dùng "rà soát/xác thực hồ sơ" theo thuật ngữ của SHUB.
- Footer dùng chung với homepage, bao gồm khước từ trách nhiệm về nội dung AI.
- Không hiển thị số liệu giả như thật: dữ liệu minh họa phải có dòng ghi chú `.demo`.

---

## 15. Checklist trước khi bàn giao

- [ ] Light và dark đều đạt tương phản, không có chữ `--mut` trên nền `--bg2` dưới 4.5:1
- [ ] Lưới đúng số cột ở 1280, 900, 560px; không cuộn ngang ở 375px
- [ ] Chip lọc có trạng thái `.on`, không có kết quả, loading, lỗi
- [ ] Modal mở/đóng bằng bàn phím, có focus trap và trả focus
- [ ] `prefers-reduced-motion` tắt reveal và hover transform
- [ ] Mọi chuỗi UI tiếng Việt có dấu, đi qua i18n
- [ ] Verified chỉ hiện khi qua cổng năng lực (cổng 2)
- [ ] Giá và đánh giá dùng định dạng thống nhất (`1.500.000đ`, `4.9`)
