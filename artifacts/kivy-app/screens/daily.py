from kivy.uix.screenmanager import Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.spinner import Spinner
from kivy.graphics import Color, RoundedRectangle, Rectangle
from kivy.metrics import dp
from kivy.animation import Animation
import api_client
from utils import LEVELS, get_article_color, get_level_color, BG_COLOR, CARD_BG, TEXT_DARK, TEXT_GREY


def rnd_btn(text, color, on_press):
    b = Button(text=text, background_normal='', background_color=(0, 0, 0, 0),
               color=(1, 1, 1, 1), bold=True, font_size=dp(14))
    b.bind(on_release=lambda *a: on_press())
    with b.canvas.before:
        Color(*color)
        bg = RoundedRectangle(pos=b.pos, size=b.size, radius=[dp(10)])
    b.bind(pos=lambda w, v: setattr(bg, 'pos', v),
           size=lambda w, v: setattr(bg, 'size', v))
    return b


class DailyCardWidget(BoxLayout):
    def __init__(self, card, **kwargs):
        super().__init__(orientation='vertical', padding=dp(20),
                         spacing=dp(10), **kwargs)
        self.card = card
        self._front = True
        with self.canvas.before:
            Color(*CARD_BG)
            bg = RoundedRectangle(pos=self.pos, size=self.size, radius=[dp(16)])
        self.bind(pos=lambda w, v: setattr(bg, 'pos', v),
                  size=lambda w, v: setattr(bg, 'size', v))
        self._show_front()
        self.bind(on_touch_up=self._on_tap)

    def _clear(self):
        self.clear_widgets()

    def _show_front(self):
        self._clear()
        card = self.card
        level_color = get_level_color(card.get('level', 'A1'))
        article_color = get_article_color(card.get('article'))

        badge_row = BoxLayout(size_hint_y=None, height=dp(28))
        badge = Label(text=card.get('level', ''), bold=True, color=(1, 1, 1, 1),
                      size_hint=(None, None), size=(dp(40), dp(24)))
        with badge.canvas.before:
            Color(*level_color)
            bb = RoundedRectangle(pos=badge.pos, size=badge.size, radius=[dp(6)])
        badge.bind(pos=lambda w, v: setattr(bb, 'pos', v),
                   size=lambda w, v: setattr(bb, 'size', v))
        cat = Label(text=card.get('category', '').upper(), color=TEXT_GREY,
                    font_size=dp(11), halign='right', text_size=(None, None))
        cat.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        badge_row.add_widget(badge)
        badge_row.add_widget(cat)
        self.add_widget(badge_row)

        word_row = BoxLayout(size_hint_y=None, height=dp(56), spacing=dp(4))
        article = card.get('article', '')
        if article:
            art_lbl = Label(text=article, bold=True, font_size=dp(26),
                            color=article_color, size_hint_x=None, width=dp(54),
                            halign='right', text_size=(dp(54), None))
            word_row.add_widget(art_lbl)
        base = Label(text=card.get('baseWord', card.get('word', '')),
                     bold=True, font_size=dp(26), color=TEXT_DARK,
                     halign='left', text_size=(None, None))
        base.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        word_row.add_widget(base)
        self.add_widget(word_row)

        self.add_widget(Label(text='Tap to reveal', color=TEXT_GREY,
                              font_size=dp(12), size_hint_y=None, height=dp(20)))
        self.add_widget(Label())

    def _show_back(self):
        self._clear()
        self.unbind(on_touch_up=self._on_tap)
        card = self.card

        for label, key, align in [
            ('English', 'englishTranslation', 'left'),
            ('Arabic (العربية)', 'arabicTranslation', 'right'),
        ]:
            self.add_widget(Label(text=label, color=TEXT_GREY, font_size=dp(11),
                                  size_hint_y=None, height=dp(16),
                                  halign=align, text_size=(None, None)))
            val = Label(text=card.get(key, ''), bold=True, font_size=dp(19),
                        color=TEXT_DARK, size_hint_y=None, height=dp(32),
                        halign=align, text_size=(None, None))
            val.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
            self.add_widget(val)

        self.add_widget(Label(text='Example', color=TEXT_GREY, font_size=dp(11),
                              size_hint_y=None, height=dp(16)))
        ex = Label(text=card.get('exampleSentenceDe', ''), color=(0.3, 0.3, 0.3, 1),
                   font_size=dp(12), halign='left', text_size=(None, None))
        ex.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self.add_widget(ex)

    def _on_tap(self, widget, touch):
        if self.collide_point(*touch.pos):
            self._flip()

    def _flip(self):
        def _swap(anim, w):
            self._show_back()
            self._front = False
            Animation(size_hint_x=1, duration=0.12).start(self)
        anim = Animation(size_hint_x=0, duration=0.12)
        anim.bind(on_complete=_swap)
        anim.start(self)


class DailyScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._cards = []
        self._idx = 0
        self._level_filter = None
        self._build()

    def _build(self):
        with self.canvas.before:
            Color(*BG_COLOR)
            self._bg = Rectangle(pos=self.pos, size=self.size)
        self.bind(pos=lambda w, v: setattr(self._bg, 'pos', v),
                  size=lambda w, v: setattr(self._bg, 'size', v))

        root = BoxLayout(orientation='vertical', padding=dp(16), spacing=dp(12))

        # Top bar
        top = BoxLayout(size_hint_y=None, height=dp(46))
        back = Button(text='← Back', background_normal='',
                      background_color=(0.7, 0.7, 0.7, 1), color=(1, 1, 1, 1),
                      bold=True, font_size=dp(13), size_hint_x=None, width=dp(80))
        back.bind(on_release=lambda *a: setattr(self.manager, 'current', 'dashboard'))
        title = Label(text='Daily Review', bold=True, color=TEXT_DARK,
                      font_size=dp(17))
        self._counter = Label(text='', color=TEXT_GREY, font_size=dp(14),
                              size_hint_x=None, width=dp(60), halign='right',
                              text_size=(None, None))
        self._counter.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        top.add_widget(back)
        top.add_widget(title)
        top.add_widget(self._counter)
        root.add_widget(top)

        # Level filter
        filter_row = BoxLayout(size_hint_y=None, height=dp(40), spacing=dp(8))
        filter_row.add_widget(Label(text='Level:', color=TEXT_GREY,
                                    font_size=dp(13), size_hint_x=None, width=dp(46)))
        self._spinner = Spinner(text='All', values=['All'] + LEVELS,
                                size_hint_x=None, width=dp(100),
                                background_normal='', background_color=(0.9, 0.9, 0.9, 1))
        self._spinner.bind(text=self._on_level_change)
        filter_row.add_widget(self._spinner)
        filter_row.add_widget(Label())
        root.add_widget(filter_row)

        # Card area
        self._card_area = BoxLayout(orientation='vertical')
        self._card_area.add_widget(Label(text='Loading…', color=TEXT_GREY))
        root.add_widget(self._card_area)

        # Actions
        actions = BoxLayout(size_hint_y=None, height=dp(52), spacing=dp(12))
        actions.add_widget(rnd_btn('✗  Unknown', (0.96, 0.26, 0.21, 1), self._mark_unknown))
        actions.add_widget(rnd_btn('✓  Known',   (0.30, 0.69, 0.31, 1), self._mark_known))
        root.add_widget(actions)

        nav = BoxLayout(size_hint_y=None, height=dp(40), spacing=dp(12))
        nav.add_widget(rnd_btn('← Prev', (0.7, 0.7, 0.7, 1), self._prev))
        nav.add_widget(rnd_btn('Next →', (0.7, 0.7, 0.7, 1), self._next))
        root.add_widget(nav)

        self.add_widget(root)

    def on_enter(self):
        self._load()

    def _on_level_change(self, spinner, text):
        self._level_filter = None if text == 'All' else text
        self._load()

    def _load(self):
        self._card_area.clear_widgets()
        self._card_area.add_widget(Label(text='Loading…', color=TEXT_GREY))
        self._cards = []
        self._idx = 0
        api_client.get_daily_flashcards(level=self._level_filter,
                                         callback=self._on_cards,
                                         error_callback=self._on_error)

    def _on_cards(self, data):
        self._cards = data if isinstance(data, list) else []
        if not self._cards:
            self._status('No daily cards available.')
            return
        self._show_card()

    def _on_error(self, msg):
        self._status(f'Error: {msg}')

    def _status(self, msg):
        self._card_area.clear_widgets()
        self._counter.text = ''
        self._card_area.add_widget(Label(text=msg, color=TEXT_GREY))

    def _show_card(self):
        card = self._cards[self._idx]
        self._counter.text = f'{self._idx + 1}/{len(self._cards)}'
        self._card_area.clear_widgets()
        self._card_area.add_widget(DailyCardWidget(card))

    def _mark_known(self):
        self._mark(True)

    def _mark_unknown(self):
        self._mark(False)

    def _mark(self, known):
        if not self._cards:
            return
        api_client.update_progress(self._cards[self._idx]['id'], known)
        self._next()

    def _next(self):
        if self._cards and self._idx < len(self._cards) - 1:
            self._idx += 1
            self._show_card()
        elif self._cards and self._idx == len(self._cards) - 1:
            self._status('Session complete! All cards reviewed.')

    def _prev(self):
        if self._cards and self._idx > 0:
            self._idx -= 1
            self._show_card()
