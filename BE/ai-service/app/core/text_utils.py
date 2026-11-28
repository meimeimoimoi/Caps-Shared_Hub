import unicodedata


def strip_vietnamese_accents(text: str) -> str:
    """Fold Vietnamese diacritics to ASCII for accent-insensitive matching."""
    decomposed = unicodedata.normalize("NFD", text or "")
    without_marks = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return without_marks.replace("đ", "d").replace("Đ", "D")
