import arabic_reshaper
from bidi.algorithm import get_display

LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

FONT_ARABIC = 'NotoSansArabic'
FONT_EMOJI  = 'NotoColorEmoji'


def ar_text(text: str) -> str:
    """Reshape + apply bidi algorithm so Kivy renders Arabic correctly."""
    if not text:
        return ''
    return get_display(arabic_reshaper.reshape(text))

LEVEL_COLORS = {
    'A1': (0.13, 0.77, 0.37, 1),
    'A2': (0.08, 0.72, 0.65, 1),
    'B1': (0.23, 0.51, 0.96, 1),
    'B2': (0.58, 0.20, 0.92, 1),
    'C1': (0.86, 0.15, 0.15, 1),
}

ARTICLE_COLORS = {
    'der': (0.13, 0.59, 0.95, 1),
    'die': (0.96, 0.26, 0.21, 1),
    'das': (0.30, 0.69, 0.31, 1),
}

BG_COLOR = (0.97, 0.96, 0.95, 1)
CARD_BG  = (1.00, 1.00, 1.00, 1)
TEXT_DARK = (0.10, 0.10, 0.10, 1)
TEXT_GREY = (0.45, 0.45, 0.45, 1)


def get_article_color(article):
    if not article:
        return (0.50, 0.50, 0.50, 1)
    return ARTICLE_COLORS.get(article.lower(), (0.50, 0.50, 0.50, 1))


def get_level_color(level):
    return LEVEL_COLORS.get(level, (0.50, 0.50, 0.50, 1))
