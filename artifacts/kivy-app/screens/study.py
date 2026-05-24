from kivy.uix.screenmanager import Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.image import AsyncImage
from kivy.graphics import Color, RoundedRectangle, Rectangle
from kivy.metrics import dp
from kivy.animation import Animation
import local_storage
import image_cache
from utils import get_article_color, get_level_color, BG_COLOR, CARD_BG, TEXT_DARK, TEXT_GREY, ar_text, FONT_ARABIC, FONT_EMOJI


def _rnd_btn(text, color, on_press):
    b = Button(text=text, background_normal='', background_color=(0, 0, 0, 0),
               color=(1, 1, 1, 1), bold=True, font_size=dp(14))
    b.bind(on_release=lambda *a: on_press())
    with b.canvas.before:
        Color(*color)
        bg = RoundedRectangle(pos=b.pos, size=b.size, radius=[dp(10)])
    b.bind(pos=lambda w, v: setattr(bg, 'pos', v),
           size=lambda w, v: setattr(bg, 'size', v))
    return b


class CardImageBox(BoxLayout):
    """Shows photo if available, otherwise article-coloured placeholder."""
    def __init__(self, card, **kwargs):
        super().__init__(size_hint_y=None, height=dp(150),
                         orientation='vertical', **kwargs)
        article_color = get_article_color(card.get('article'))
        url = card.get('imageUrl')

        cached = image_cache.get_cached_path(url) if url else None
        if cached:
            self.add_widget(AsyncImage(source=cached, allow_stretch=True,
                                       keep_ratio=True))
        elif url:
            # Placeholder while downloading
            self._placeholder(article_color, card.get('article') or '•')
            image_cache.fetch_image(url, self._on_image)
        else:
            self._placeholder(article_color, card.get('article') or '•')

    def _placeholder(self, color, text):
        box = BoxLayout()
        with box.canvas.before:
            Color(*color)
            rr = RoundedRectangle(pos=box.pos, size=box.size, radius=[dp(12)])
        box.bind(pos=lambda w, v: setattr(rr, 'pos', v),
                 size=lambda w, v: setattr(rr, 'size', v))
        lbl = Label(text=text, bold=True, font_size=dp(36), color=(1, 1, 1, 1))
        box.add_widget(lbl)
        self._ph = box
        self.add_widget(box)

    def _on_image(self, path):
        if path:
            self.clear_widgets()
            self.add_widget(AsyncImage(source=path, allow_stretch=True,
                                        keep_ratio=True))


class FlashCardWidget(BoxLayout):
    def __init__(self, card, **kwargs):
        super().__init__(orientation='vertical', padding=dp(16),
                         spacing=dp(8), **kwargs)
        self.card = card
        self._front = True
        with self.canvas.before:
            Color(*CARD_BG)
            self._bg = RoundedRectangle(pos=self.pos, size=self.size, radius=[dp(16)])
        self.bind(pos=lambda w, v: setattr(self._bg, 'pos', v),
                  size=lambda w, v: setattr(self._bg, 'size', v))
        self._show_front()
        self.bind(on_touch_up=self._on_tap)

    def _clear(self):
        self.clear_widgets()

    def _show_front(self):
        self._clear()
        card = self.card
        level_color  = get_level_color(card.get('level', 'A1'))
        article_color = get_article_color(card.get('article'))

        # Badge + category row
        top = BoxLayout(size_hint_y=None, height=dp(28))
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
        top.add_widget(badge)
        top.add_widget(cat)
        self.add_widget(top)

        # Photo / placeholder
        self.add_widget(CardImageBox(card))

        # German word
        word_row = BoxLayout(size_hint_y=None, height=dp(48), spacing=dp(4))
        article = card.get('article', '')
        if article:
            art = Label(text=article, bold=True, font_size=dp(26),
                        color=article_color, size_hint_x=None, width=dp(54),
                        halign='right', text_size=(dp(54), None))
            word_row.add_widget(art)
        base = Label(text=card.get('baseWord', card.get('word', '')),
                     bold=True, font_size=dp(26), color=TEXT_DARK,
                     halign='left', text_size=(None, None))
        base.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        word_row.add_widget(base)
        self.add_widget(word_row)

        # Speak + flip hint
        bottom = BoxLayout(size_hint_y=None, height=dp(36), spacing=dp(8))
        speak = Button(text='🔊 Pronounce', background_normal='',
                       background_color=(0, 0, 0, 0), color=(0.13, 0.59, 0.95, 1),
                       bold=True, font_size=dp(13), size_hint_x=None, width=dp(140))
        speak.bind(on_release=lambda *a: self._speak())
        with speak.canvas.before:
            Color(0.13, 0.59, 0.95, 0.12)
            sb = RoundedRectangle(pos=speak.pos, size=speak.size, radius=[dp(8)])
        speak.bind(pos=lambda w, v: setattr(sb, 'pos', v),
                   size=lambda w, v: setattr(sb, 'size', v))
        hint = Label(text='Tap card to flip', color=TEXT_GREY, font_size=dp(11),
                     halign='right', text_size=(None, None))
        hint.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        bottom.add_widget(speak)
        bottom.add_widget(hint)
        self.add_widget(bottom)

    def _show_back(self):
        self._clear()
        self.unbind(on_touch_up=self._on_tap)
        card = self.card

        for label, key, align in [
            ('English', 'englishTranslation', 'left'),
            ('Arabic  (العربية)', 'arabicTranslation', 'right'),
        ]:
            is_ar = key == 'arabicTranslation'
            hdr = Label(text=label, color=TEXT_GREY, font_size=dp(11),
                        size_hint_y=None, height=dp(16),
                        halign=align, text_size=(None, None))
            if is_ar:
                hdr.font_name = FONT_ARABIC
            self.add_widget(hdr)
            raw = card.get(key, '')
            val = Label(text=ar_text(raw) if is_ar else raw,
                        bold=True, font_size=dp(20),
                        color=TEXT_DARK, size_hint_y=None, height=dp(34),
                        halign=align, text_size=(None, None))
            if is_ar:
                val.font_name = FONT_ARABIC
            val.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
            self.add_widget(val)

        self.add_widget(Label(text='Example sentence', color=TEXT_GREY,
                              font_size=dp(11), size_hint_y=None, height=dp(16)))
        for key in ('exampleSentenceDe', 'exampleSentenceEn'):
            ex = Label(text=card.get(key, ''), color=(0.3, 0.3, 0.3, 1),
                       font_size=dp(12), halign='left', text_size=(None, None))
            ex.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
            self.add_widget(ex)

        # Speak again on back
        speak = Button(text='▶  Pronounce', background_normal='',
                       background_color=(0, 0, 0, 0), color=(0.13, 0.59, 0.95, 1),
                       bold=True, font_size=dp(13), size_hint_y=None, height=dp(34))
        speak.bind(on_release=lambda *a: self._speak())
        self.add_widget(speak)

    def _on_tap(self, widget, touch):
        if self.collide_point(*touch.pos) and not getattr(touch, 'is_mouse_scrolling', False):
            self._flip()

    def _flip(self):
        def _swap(anim, w):
            if self._front:
                self._show_back()
            else:
                self._show_front()
            self._front = not self._front
            Animation(size_hint_x=1, duration=0.12).start(self)
        anim = Animation(size_hint_x=0, duration=0.12)
        anim.bind(on_complete=_swap)
        anim.start(self)

    def _speak(self):
        from tts import speak as tts_speak, last_error
        from kivy.uix.popup import Popup
        from kivy.uix.label import Label as _L
        word = self.card.get('word', '')
        tts_speak(word)
        err = last_error()
        if err:
            Popup(title='Pronunciation unavailable',
                  content=_L(text=err + '\n\nOn Windows, ensure a German voice is\n'
                                        'installed: Settings → Time & Language →\n'
                                        'Speech → Add voice → German.'),
                  size_hint=(0.85, 0.4)).open()


class StudyScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._level = 'A1'
        self._cards = []
        self._idx = 0
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

        top = BoxLayout(size_hint_y=None, height=dp(46))
        back = _rnd_btn('← Back', (0.6, 0.6, 0.6, 1), self._go_back)
        back.size_hint_x = None
        back.width = dp(80)
        self._title_lbl = Label(text='STUDY', bold=True, color=TEXT_DARK, font_size=dp(16))
        self._counter = Label(text='', color=TEXT_GREY, font_size=dp(14),
                              size_hint_x=None, width=dp(60),
                              halign='right', text_size=(None, None))
        self._counter.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        top.add_widget(back)
        top.add_widget(self._title_lbl)
        top.add_widget(self._counter)
        root.add_widget(top)

        self._card_area = BoxLayout(orientation='vertical')
        self._card_area.add_widget(Label(text='Loading…', color=TEXT_GREY))
        root.add_widget(self._card_area)

        actions = BoxLayout(size_hint_y=None, height=dp(52), spacing=dp(12))
        actions.add_widget(_rnd_btn('✗  Unknown', (0.96, 0.26, 0.21, 1), self._mark_unknown))
        actions.add_widget(_rnd_btn('✓  Known',   (0.30, 0.69, 0.31, 1), self._mark_known))
        root.add_widget(actions)

        nav = BoxLayout(size_hint_y=None, height=dp(40), spacing=dp(12))
        nav.add_widget(_rnd_btn('← Prev', (0.7, 0.7, 0.7, 1), self._prev))
        nav.add_widget(_rnd_btn('Next →', (0.7, 0.7, 0.7, 1), self._next))
        root.add_widget(nav)

        self.add_widget(root)

    def on_enter(self):
        self._title_lbl.text = f'{self._level} STUDY'
        self._idx = 0
        data = local_storage.get_cards(level=self._level, limit=50)
        self._cards = data.get('items', [])
        if self._cards:
            self._show_card()
        else:
            self._status('No cards for this level.')

    def _status(self, msg):
        self._card_area.clear_widgets()
        self._counter.text = ''
        self._card_area.add_widget(Label(text=msg, color=TEXT_GREY, font_size=dp(14)))

    def _show_card(self):
        card = self._cards[self._idx]
        self._counter.text = f'{self._idx + 1}/{len(self._cards)}'
        self._card_area.clear_widgets()
        self._card_area.add_widget(FlashCardWidget(card))

    def _mark_known(self):   self._mark(True)
    def _mark_unknown(self): self._mark(False)

    def _mark(self, known):
        if not self._cards:
            return
        local_storage.update_progress(self._cards[self._idx]['id'], known)
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
