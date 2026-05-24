from kivy.uix.screenmanager import Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.graphics import Color, RoundedRectangle, Rectangle
from kivy.metrics import dp
import local_storage
from utils import LEVELS, get_article_color, get_level_color, BG_COLOR, CARD_BG, TEXT_DARK, TEXT_GREY


class CardRow(BoxLayout):
    def __init__(self, card, **kwargs):
        super().__init__(orientation='horizontal', padding=dp(12),
                         spacing=dp(10), size_hint_y=None, height=dp(72), **kwargs)
        with self.canvas.before:
            Color(*CARD_BG)
            bg = RoundedRectangle(pos=self.pos, size=self.size, radius=[dp(10)])
        self.bind(pos=lambda w, v: setattr(bg, 'pos', v),
                  size=lambda w, v: setattr(bg, 'size', v))

        article = card.get('article', '')
        article_color = get_article_color(article)
        level_color   = get_level_color(card.get('level', 'A1'))

        left = BoxLayout(orientation='vertical', spacing=dp(2))
        word_row = BoxLayout(size_hint_y=None, height=dp(30), spacing=dp(4))
        if article:
            art = Label(text=article, bold=True, font_size=dp(16),
                        color=article_color, size_hint_x=None, width=dp(36),
                        halign='right', text_size=(dp(36), None))
            word_row.add_widget(art)
        base = Label(text=card.get('baseWord', card.get('word', '')),
                     bold=True, font_size=dp(16), color=TEXT_DARK,
                     halign='left', text_size=(None, None))
        base.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        word_row.add_widget(base)
        left.add_widget(word_row)
        en = Label(text=card.get('englishTranslation', ''), color=TEXT_GREY,
                   font_size=dp(12), halign='left', text_size=(None, None))
        en.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        left.add_widget(en)
        ar = Label(text=card.get('arabicTranslation', ''), color=TEXT_GREY,
                   font_size=dp(11), halign='right', text_size=(None, None))
        ar.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        left.add_widget(ar)
        self.add_widget(left)

        right = BoxLayout(orientation='vertical', size_hint_x=None, width=dp(58), spacing=dp(4))
        lvl = Label(text=card.get('level', ''), bold=True, color=(1, 1, 1, 1),
                    font_size=dp(11), size_hint_y=None, height=dp(22))
        with lvl.canvas.before:
            Color(*level_color)
            lb = RoundedRectangle(pos=lvl.pos, size=lvl.size, radius=[dp(4)])
        lvl.bind(pos=lambda w, v: setattr(lb, 'pos', v),
                 size=lambda w, v: setattr(lb, 'size', v))
        known_color = (0.30, 0.69, 0.31, 1) if card.get('known') else (0.75, 0.75, 0.75, 1)
        known_lbl = Label(text='✓ known' if card.get('known') else '○ new',
                          color=known_color, font_size=dp(10))
        right.add_widget(lvl)
        right.add_widget(known_lbl)
        self.add_widget(right)


class BrowseScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._level = None
        self._build()

    def _build(self):
        with self.canvas.before:
            Color(*BG_COLOR)
            self._bg = Rectangle(pos=self.pos, size=self.size)
        self.bind(pos=lambda w, v: setattr(self._bg, 'pos', v),
                  size=lambda w, v: setattr(self._bg, 'size', v))

        root = BoxLayout(orientation='vertical', padding=dp(16), spacing=dp(10))

        top = BoxLayout(size_hint_y=None, height=dp(46))
        back = Button(text='← Back', background_normal='',
                      background_color=(0.7, 0.7, 0.7, 1), color=(1, 1, 1, 1),
                      bold=True, font_size=dp(13), size_hint_x=None, width=dp(80))
        back.bind(on_release=lambda *a: setattr(self.manager, 'current', 'dashboard'))
        title = Label(text='Browse Cards', bold=True, color=TEXT_DARK, font_size=dp(17))
        top.add_widget(back)
        top.add_widget(title)
        root.add_widget(top)

        # Filter tabs
        tabs = BoxLayout(size_hint_y=None, height=dp(40), spacing=dp(6))
        all_btn = Button(text='All', background_normal='',
                         background_color=(0.2, 0.2, 0.2, 1), color=(1, 1, 1, 1),
                         bold=True, font_size=dp(12), size_hint_x=None, width=dp(40))
        all_btn.bind(on_release=lambda *a: self._set_level(None))
        tabs.add_widget(all_btn)
        for lv in LEVELS:
            col = get_level_color(lv)
            b = Button(text=lv, background_normal='', background_color=(0, 0, 0, 0),
                       color=(1, 1, 1, 1), bold=True, font_size=dp(12),
                       size_hint_x=None, width=dp(46))
            with b.canvas.before:
                Color(*col)
                bg = RoundedRectangle(pos=b.pos, size=b.size, radius=[dp(6)])
            b.bind(pos=lambda w, v, r=bg: setattr(r, 'pos', v),
                   size=lambda w, v, r=bg: setattr(r, 'size', v),
                   on_release=lambda *a, l=lv: self._set_level(l))
            tabs.add_widget(b)
        root.add_widget(tabs)

        self._count_lbl = Label(text='', color=TEXT_GREY, font_size=dp(12),
                                size_hint_y=None, height=dp(20),
                                halign='left', text_size=(None, None))
        self._count_lbl.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        root.add_widget(self._count_lbl)

        scroll = ScrollView()
        self._list = GridLayout(cols=1, spacing=dp(8), size_hint_y=None,
                                padding=[0, 0, 0, dp(16)])
        self._list.bind(minimum_height=self._list.setter('height'))
        scroll.add_widget(self._list)
        root.add_widget(scroll)

        self.add_widget(root)

    def on_enter(self):
        self._load()

    def _set_level(self, level):
        self._level = level
        self._load()

    def _load(self):
        data = local_storage.get_cards(level=self._level, limit=200)
        items = data.get('items', [])
        self._count_lbl.text = f'{data.get("total", len(items))} cards'
        self._list.clear_widgets()
        for card in items:
            self._list.add_widget(CardRow(card))
