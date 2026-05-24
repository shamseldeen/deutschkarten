from kivy.uix.screenmanager import Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.graphics import Color, RoundedRectangle, Rectangle
from kivy.metrics import dp
from kivy.animation import Animation
import api_client
from utils import get_article_color, get_level_color, BG_COLOR, CARD_BG, TEXT_DARK, TEXT_GREY


def rounded_btn(text, color, on_press, width=None):
    kw = {'size_hint_x': None, 'width': width} if width else {}
    b = Button(text=text, background_normal='', background_color=(0, 0, 0, 0),
               color=(1, 1, 1, 1), bold=True, font_size=dp(14), **kw)
    b.bind(on_release=lambda *a: on_press())
    with b.canvas.before:
        Color(*color)
        bg = RoundedRectangle(pos=b.pos, size=b.size, radius=[dp(10)])
    b.bind(pos=lambda w, v: setattr(bg, 'pos', v),
           size=lambda w, v: setattr(bg, 'size', v))
    return b


class FlashCardWidget(BoxLayout):
    """Card that flips between front (German) and back (translations)."""

    def __init__(self, card, **kwargs):
        super().__init__(orientation='vertical', padding=dp(20),
                         spacing=dp(10), **kwargs)
        self.card = card
        self._showing_front = True
        self._build_front()

        with self.canvas.before:
            Color(*CARD_BG)
            self._bg_rect = RoundedRectangle(pos=self.pos, size=self.size, radius=[dp(16)])
        self.bind(pos=lambda w, v: setattr(self._bg_rect, 'pos', v),
                  size=lambda w, v: setattr(self._bg_rect, 'size', v))

    def _clear(self):
        self.clear_widgets()

    def _build_front(self):
        self._clear()
        card = self.card
        article_color = get_article_color(card.get('article'))
        level_color = get_level_color(card.get('level', 'A1'))

        # Level badge
        badge_row = BoxLayout(size_hint_y=None, height=dp(30))
        badge = Label(text=card.get('level', ''), bold=True, color=(1, 1, 1, 1),
                      size_hint=(None, None), size=(dp(40), dp(24)))
        with badge.canvas.before:
            Color(*level_color)
            b_bg = RoundedRectangle(pos=badge.pos, size=badge.size, radius=[dp(6)])
        badge.bind(pos=lambda w, v: setattr(b_bg, 'pos', v),
                   size=lambda w, v: setattr(b_bg, 'size', v))
        cat = Label(text=card.get('category', '').upper(), color=TEXT_GREY,
                    font_size=dp(11), halign='right', text_size=(None, None))
        cat.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        badge_row.add_widget(badge)
        badge_row.add_widget(cat)
        self.add_widget(badge_row)

        # German word (article colored)
        word_box = BoxLayout(size_hint_y=None, height=dp(60),
                             orientation='horizontal')
        article = card.get('article', '')
        if article:
            art_lbl = Label(text=article, bold=True, font_size=dp(28),
                            color=article_color, size_hint_x=None,
                            width=dp(60), halign='right',
                            text_size=(dp(60), None))
            word_box.add_widget(art_lbl)
        base_lbl = Label(text=card.get('baseWord', card.get('word', '')),
                         bold=True, font_size=dp(28), color=TEXT_DARK,
                         halign='left', text_size=(None, None))
        base_lbl.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        word_box.add_widget(base_lbl)
        self.add_widget(word_box)

        # Pronunciation hint
        self.add_widget(Label(text='Tap card to reveal translation',
                              color=TEXT_GREY, font_size=dp(12),
                              size_hint_y=None, height=dp(20)))

        # Spacer
        self.add_widget(Label())

        # Speak button
        speak_btn = rounded_btn('🔊  Pronounce', (0.13, 0.59, 0.95, 1),
                                lambda: self._speak(), width=dp(140))
        speak_row = BoxLayout(size_hint_y=None, height=dp(40))
        speak_row.add_widget(Label())
        speak_row.add_widget(speak_btn)
        speak_row.add_widget(Label())
        self.add_widget(speak_row)

        # Tap to flip
        self.bind(on_touch_up=self._on_tap)

    def _build_back(self):
        self._clear()
        self.unbind(on_touch_up=self._on_tap)
        card = self.card

        # English
        self.add_widget(Label(text='English', color=TEXT_GREY, font_size=dp(11),
                              size_hint_y=None, height=dp(18), halign='left',
                              text_size=(None, None)))
        en = Label(text=card.get('englishTranslation', ''), bold=True,
                   font_size=dp(20), color=TEXT_DARK, size_hint_y=None,
                   height=dp(36), halign='left', text_size=(None, None))
        en.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self.add_widget(en)

        # Arabic (RTL)
        self.add_widget(Label(text='العربية', color=TEXT_GREY, font_size=dp(11),
                              size_hint_y=None, height=dp(18), halign='right',
                              text_size=(None, None)))
        ar = Label(text=card.get('arabicTranslation', ''), font_size=dp(20),
                   bold=True, color=TEXT_DARK, size_hint_y=None, height=dp(36),
                   halign='right', text_size=(None, None))
        ar.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self.add_widget(ar)

        # Example sentence
        self.add_widget(Label(text='Example', color=TEXT_GREY, font_size=dp(11),
                              size_hint_y=None, height=dp(18)))
        ex = Label(text=card.get('exampleSentenceDe', ''), color=(0.3, 0.3, 0.3, 1),
                   font_size=dp(13), halign='left', text_size=(None, None))
        ex.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self.add_widget(ex)
        ex_en = Label(text=card.get('exampleSentenceEn', ''), color=TEXT_GREY,
                      font_size=dp(12), halign='left', text_size=(None, None))
        ex_en.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self.add_widget(ex_en)

    def _on_tap(self, widget, touch):
        if self.collide_point(*touch.pos) and touch.is_mouse_scrolling is False:
            self.flip()

    def flip(self):
        def _swap(anim, widget):
            if self._showing_front:
                self._build_back()
            else:
                self._build_front()
            self._showing_front = not self._showing_front
            Animation(size_hint_x=1, duration=0.12).start(self)

        anim = Animation(size_hint_x=0, duration=0.12)
        anim.bind(on_complete=_swap)
        anim.start(self)

    def _speak(self):
        try:
            import pyttsx3
            engine = pyttsx3.init()
            for voice in engine.getProperty('voices'):
                if 'german' in voice.name.lower() or 'de' in voice.id.lower():
                    engine.setProperty('voice', voice.id)
                    break
            engine.setProperty('rate', 130)
            engine.say(self.card.get('word', ''))
            engine.runAndWait()
        except Exception:
            pass


class StudyScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._level = 'A1'
        self._cards = []
        self._idx = 0
        self._card_widget = None
        self._build()

    def set_level(self, level):
        self._level = level

    def _build(self):
        with self.canvas.before:
            Color(*BG_COLOR)
            self._bg = Rectangle(pos=self.pos, size=self.size)
        self.bind(pos=lambda w, v: setattr(self._bg, 'pos', v),
                  size=lambda w, v: setattr(self._bg, 'size', v))

        root = BoxLayout(orientation='vertical', padding=dp(16), spacing=dp(12))

        # Top bar
        top = BoxLayout(size_hint_y=None, height=dp(46))
        back_btn = rounded_btn('← Back', (0.5, 0.5, 0.5, 1),
                               lambda: self._go_back(), width=dp(80))
        self._title_lbl = Label(text='STUDY', bold=True, color=TEXT_DARK,
                                font_size=dp(16))
        self._counter_lbl = Label(text='', color=TEXT_GREY, font_size=dp(14),
                                  size_hint_x=None, width=dp(60), halign='right',
                                  text_size=(None, None))
        self._counter_lbl.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        top.add_widget(back_btn)
        top.add_widget(self._title_lbl)
        top.add_widget(self._counter_lbl)
        root.add_widget(top)

        # Card area
        self._card_area = BoxLayout(orientation='vertical')
        self._status_lbl = Label(text='Loading…', color=TEXT_GREY, font_size=dp(15))
        self._card_area.add_widget(self._status_lbl)
        root.add_widget(self._card_area)

        # Action buttons
        actions = BoxLayout(size_hint_y=None, height=dp(52), spacing=dp(12))
        self._unknown_btn = rounded_btn('✗  Unknown', (0.96, 0.26, 0.21, 1),
                                        self._mark_unknown)
        self._known_btn = rounded_btn('✓  Known', (0.30, 0.69, 0.31, 1),
                                      self._mark_known)
        actions.add_widget(self._unknown_btn)
        actions.add_widget(self._known_btn)
        root.add_widget(actions)

        # Next / Prev
        nav = BoxLayout(size_hint_y=None, height=dp(40), spacing=dp(12))
        prev_btn = rounded_btn('← Prev', (0.7, 0.7, 0.7, 1), self._prev)
        next_btn = rounded_btn('Next →', (0.7, 0.7, 0.7, 1), self._next)
        nav.add_widget(prev_btn)
        nav.add_widget(next_btn)
        root.add_widget(nav)

        self.add_widget(root)

    def on_enter(self):
        self._title_lbl.text = f'{self._level} STUDY'
        self._cards = []
        self._idx = 0
        self._status('Loading…')
        api_client.list_flashcards(level=self._level, limit=50,
                                   callback=self._on_cards,
                                   error_callback=self._on_error)

    def _on_cards(self, data):
        self._cards = data.get('items', [])
        if not self._cards:
            self._status('No cards found for this level.')
            return
        self._show_card()

    def _on_error(self, msg):
        self._status(f'Error: {msg}')

    def _status(self, msg):
        self._card_area.clear_widgets()
        self._card_widget = None
        self._counter_lbl.text = ''
        self._card_area.add_widget(Label(text=msg, color=TEXT_GREY, font_size=dp(14)))

    def _show_card(self):
        if not self._cards:
            return
        card = self._cards[self._idx]
        self._counter_lbl.text = f'{self._idx + 1}/{len(self._cards)}'
        self._card_area.clear_widgets()
        cw = FlashCardWidget(card)
        self._card_widget = cw
        self._card_area.add_widget(cw)

    def _mark_known(self):
        self._mark(True)

    def _mark_unknown(self):
        self._mark(False)

    def _mark(self, known):
        if not self._cards:
            return
        card = self._cards[self._idx]
        api_client.update_progress(card['id'], known)
        self._next()

    def _next(self):
        if self._cards and self._idx < len(self._cards) - 1:
            self._idx += 1
            self._show_card()

    def _prev(self):
        if self._cards and self._idx > 0:
            self._idx -= 1
            self._show_card()

    def _go_back(self):
        self.manager.current = 'dashboard'
