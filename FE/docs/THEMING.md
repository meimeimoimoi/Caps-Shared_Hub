# Shared UI tokens và theme

## Phân chia cấu hình

[theme.css](../src/styles/theme.css) sở hữu semantic colors: light ở `:root`, dark ở `:root[data-theme='dark']`. [globals.css](../src/styles/globals.css) import theme, ánh xạ Tailwind utilities và sở hữu typography, spacing, breakpoint, radii, shadows, control density.

Font hiện tại: `--font-sans` là Be Vietnam Pro/Geist/system; `--font-serif` là Lora/Georgia; `--font-num` là Geist/system. [index.html](../index.html) tải font và weight. Khi đổi font, cập nhật cả token lẫn nguồn tải và kiểm tra override tại màn hình cũ.

Motion có nguồn riêng ở [tokens.ts](../src/components/ui/motion/tokens.ts). Xem [motion README](MOTION.md) và [bản đồ cấu hình UI](UI-CONFIG.md).

## Xây dựng trang

Dùng utility theo vai trò:

- Trang: `bg-canvas text-text`.
- Card, dialog, input: `bg-surface text-text border-border`.
- Vùng phụ: `bg-surface-muted`.
- Heading: `text-text-strong`; mô tả: `text-text-muted`.
- Action chính: `bg-accent text-on-accent hover:bg-accent-hover`.
- Selection nhẹ: `bg-accent-soft text-accent-text`.
- Selected control đặc: `bg-selected text-on-selected`; giữ cặp token đi cùng nhau.
- Link: `text-accent-text`.
- Trạng thái: `text-success bg-success-soft`, hoặc warning/danger; luôn có nhãn.
- Chart: `--ui-chart-*`; label SVG dùng text token.
- Demo disclosure: shared DemoBanner, phân biệt với cảnh báo nghiệp vụ.
- Bôi đen chữ: quy tắc `::selection` toàn cục trong globals.css, màu ở `--ui-text-selection` / `--ui-on-text-selection` (sáng: xám ấm, tối: xám). Sidebar luôn tối dùng `--ui-sidebar-selection`. Không thêm `selection:` hoặc `::selection` riêng trong trang.

Utility cũ như `bg-paper`, `text-fg` vẫn alias shared palette. Expert `--ep-*` có aliases để migrate dần. Ưu tiên tên semantic khi viết mới.

## Thêm hoặc thay token

1. Tìm token hiện có theo vai trò; chỉ thêm khi cần vai trò mới.
2. Khai báo light/dark trong `theme.css`; thêm utility mapping nếu cần.
3. Sử dụng tại component chung, tránh điều kiện light/dark riêng trong từng component.
4. Kiểm tra tương phản, hover, active, disabled, focus, chart và popup ở cả hai theme.

Brand artwork, sidebar tối và print styles có thể có màu cố định có chủ đích. Không thêm palette riêng cho feature chỉ để né shared tokens.

## Hành vi theme

ThemeProvider ở app root; `useTheme()` cung cấp `isDark`, `toggleTheme()` và `setPreference('light' | 'dark' | 'system')`. [lib/theme.ts](../src/lib/theme.ts) áp dụng `html[data-theme]` trước React mount.

Storage key là `shared-hub-theme`, fallback đọc `expert-theme` cũ. Preference system theo hệ điều hành. System changes và lựa chọn từ tab khác được đồng bộ; storage bị chặn vẫn đổi theme trong bộ nhớ. Theme độc lập với ngôn ngữ/auth.

## Current normalization coverage

All registered route families consume shared configuration: Login, Expert registration/status, Dashboard, Expert (including case detail/settings), Admin, Knowledge, Drafts and Not Found. The former registration `ex-*`, Expert `--ep-*`, case and `hub-*` palettes are now semantic aliases. Page-specific CSS retains layout geometry while fonts and UI colors follow shared tokens.

Legacy widget variables also alias the shared palette. CSS entrance/feedback timing consumes motion variables; existing keyframes remain where they express a component-specific sequence. Continuous loading spinners keep their own loop cadence. Language/theme changes do not remount forms or start mutations.

Intentional fixed material is centralized as `--ui-login-*` for text and controls over video, plus brand/sidebar/overlay tokens. Actual Google logo and Vietnamese flag SVG fills retain their supplied colors. Fixed media does not prevent the rest of the UI from following the app theme.

Review colors, fonts and semantic token references manually. Build and lint passed during normalization; lint retains four existing warnings. Browser surfaces were unavailable, so desktop/mobile light/dark visual verification remains outstanding.
