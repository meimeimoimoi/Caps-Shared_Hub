/** Amendment relations recorded from vbpl.vn ("Lược đồ" of a document), seen from the changing source */
export const RELATION_LABEL: Record<string, string> = {
  AMENDS: 'Sửa đổi, bổ sung',
  REPLACES: 'Thay thế',
}

/** The same relations seen from the source being changed */
export const AMENDED_BY_LABEL: Record<string, string> = {
  AMENDS: 'Được sửa đổi, bổ sung bởi',
  REPLACES: 'Bị thay thế bởi',
}
