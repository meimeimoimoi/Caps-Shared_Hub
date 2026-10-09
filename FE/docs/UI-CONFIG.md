# Shared Hub UI — cấu hình và quy ước

Tài liệu hướng dẫn cấu hình hiện có; Tài liệu được gom trong FE/docs. Markdown không được nạp khi chạy ứng dụng. Source code bên dưới sở hữu giá trị thực tế.

## Nguồn cấu hình chung

- **Màu light/dark:** [theme.css](../src/styles/theme.css), với semantic tokens `--ui-*` cho canvas, surface, text, border, accent, trạng thái và chart.
- **Font, cỡ chữ, spacing, breakpoint, bo góc, bóng đổ, control density:** [globals.css](../src/styles/globals.css). File này import theme và ánh xạ Tailwind utilities.
- **Tải font và weight:** [index.html](../index.html). Token font và nguồn tải phải khớp nhau.
- **Animation:** [tokens.ts](../src/components/ui/motion/tokens.ts), tương tác CSS ở [motion.css](../src/components/ui/motion/motion.css); xem [hướng dẫn motion](MOTION.md).
- **Theme preference và storage:** [lib/theme.ts](../src/lib/theme.ts), provider ở app root.
- **Nội dung Việt/Anh:** [lib/i18n](../src/lib/i18n/index.ts) và locale resources; xem [I18N.md](I18N.md).
- **Component chung:** `src/components/ui/`, chia theo actions, forms, layout, navigation, feedback, display và motion.
- **Nghiệp vụ:** constants/types của feature; [lib/constants.ts](../src/lib/constants.ts) còn chứa mapping cũ. Chính sách giá và quyền thao tác thuộc contract nghiệp vụ.

Không sao chép toàn bộ CSS, TypeScript interfaces hoặc constants vào Markdown. Khi có khác biệt, đối chiếu source và cập nhật tài liệu.

## Chỉnh giao diện ở đâu?

1. Đổi màu trong `theme.css` cho cả light/dark; component dùng semantic class thay vì hex riêng.
2. Đổi font qua `--font-sans`, `--font-serif`, `--font-num` trong `globals.css`, rồi cập nhật font/weight tải ở `index.html`. Hiện sans là Be Vietnam Pro/Geist/system, serif là Lora/Georgia, font số là Geist/system.
3. Đổi cỡ chữ, spacing, radius hoặc shadow qua token trong `globals.css`.
4. Đổi tốc độ, easing, độ dịch chuyển qua `motion/tokens.ts`. Entry point cài duration/easing/press-scale thành CSS variables; tránh khai báo lại từng trang.
5. Đổi cấu trúc/tương tác control trong component chung để các trang kế thừa.
6. Đổi nhãn trong cả resource Việt và Anh, giữ nguyên enum/ID/payload.

Registration `ex-*`, Expert `--ep-*`, case and `hub-*` colors now alias shared semantic tokens. Font overrides have been replaced with sans/serif/num/mono tokens. Legacy component keyframes use shared timing while retaining their sequence; continuous spinners retain their loop cadence. Login video material uses centralized `--ui-login-*`; logo/flag artwork keeps fixed fills. Layout geometry remains specific to each screen.

Review shared styles against the semantic tokens manually. See [THEMING.md](THEMING.md) for coverage and visual verification limits.

## Quy ước UI

- Trang dùng canvas; card/dialog dùng surface; heading dùng text-strong; mô tả dùng text-muted. Giữ cặp foreground/background tương ứng.
- Action chính nổi bật trong nhóm thao tác; action phụ yên hơn; action nguy hiểm dùng danger và mô tả rõ hậu quả.
- Trạng thái có nhãn/icon phù hợp, không truyền đạt chỉ bằng màu. Tránh biến mọi metadata thành badge.
- Dùng font số và tabular numerals khi cần so sánh cột tiền/số.
- Layout co giãn theo nội dung/viewport; bảng rộng cuộn trong vùng bảng. Dropdown cuộn danh sách riêng và giới hạn theo viewport.
- Focus phải rõ; control có accessible name; lỗi liên kết field. Dialog giữ focus trap và trả focus về trigger.
- Phân biệt loading, empty, error, partial/stale data và demo disclosure. Thành công dựa trên kết quả adapter.
- Dùng shared motion presets, ưu tiên opacity/transform; tôn trọng reduced motion và giữ nội dung đọc được khi animation không hỗ trợ.
- Disclaimer AI, snapshot/version, readiness và quyền thao tác phản ánh dữ liệu thực tế; style không được ngụ ý đã phê duyệt.

## Kiểm tra

Kiểm tra light/dark, Việt/Anh, desktop/mobile, keyboard/focus, overflow và reduced motion ở màn hình bị ảnh hưởng. Với thay đổi source, chạy checks phù hợp trong [README.md](../README.md). Build không thay thế kiểm tra trực quan.
