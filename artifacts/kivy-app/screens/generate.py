import threading
import json
from kivy.uix.screenmanager import Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.spinner import Spinner
from kivy.uix.textinput import TextInput
from kivy.uix.slider import Slider
from kivy.graphics import Color, RoundedRectangle, Rectangle
from kivy.metrics import dp
import local_storage
import connectivity
from utils import LEVELS, get_level_color, get_article_color, BG_COLOR, CARD_BG, TEXT_DARK, TEXT_GREY


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


class GeneratedRow(BoxLayout):
    def __init__(self, card, **kwargs):
        super().__init__(orientation='vertical', padding=dp(12),
                         spacing=dp(3), size_hint_y=None, height=dp(82), **kwargs)
        with self.canvas.before:
            Color(*CARD_BG)
            bg = RoundedRectangle(pos=self.pos, size=self.size, radius=[dp(10)])
        self.bind(pos=lambda w, v: setattr(bg, 'pos', v),
                  size=lambda w, v: setattr(bg, 'size', v))

        article = card.get('article', '')
        article_color = get_article_color(article)

        word_row = BoxLayout(size_hint_y=None, height=dp(30), spacing=dp(4))
        if article:
            art = Label(text=article, bold=True, font_size=dp(17),
                        color=article_color, size_hint_x=None, width=dp(36),
                        halign='right', text_size=(dp(36), None))
            word_row.add_widget(art)
        base = Label(text=card.get('baseWord', card.get('word', '')),
                     bold=True, font_size=dp(17), color=TEXT_DARK,
                     halign='left', text_size=(None, None))
        base.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        word_row.add_widget(base)
        self.add_widget(word_row)

        en = Label(text=card.get('englishTranslation', ''), color=TEXT_GREY,
                   font_size=dp(12), halign='left', text_size=(None, None))
        en.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self.add_widget(en)

        ar = Label(text=card.get('arabicTranslation', ''), color=TEXT_GREY,
                   font_size=dp(12), halign='right', text_size=(None, None))
        ar.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self.add_widget(ar)


class GenerateScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._build()
        connectivity.add_listener(self._on_connectivity)

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
        title = Label(text='Generate AI Cards', bold=True, color=TEXT_DARK, font_size=dp(17))
        top.add_widget(back)
        top.add_widget(title)
        root.add_widget(top)

        # Online status banner
        self._banner = Label(text='', font_size=dp(12), size_hint_y=None, height=dp(24),
                             halign='center', text_size=(None, None))
        self._banner.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        root.add_widget(self._banner)

        # Form
        form = BoxLayout(orientation='vertical', padding=dp(14), spacing=dp(10),
                         size_hint_y=None, height=dp(210))
        with form.canvas.before:
            Color(*CARD_BG)
            f_bg = RoundedRectangle(pos=form.pos, size=form.size, radius=[dp(12)])
        form.bind(pos=lambda w, v: setattr(f_bg, 'pos', v),
                  size=lambda w, v: setattr(f_bg, 'size', v))

        lv_row = BoxLayout(size_hint_y=None, height=dp(38), spacing=dp(8))
        lv_row.add_widget(Label(text='Level:', color=TEXT_DARK, font_size=dp(14),
                                size_hint_x=None, width=dp(60)))
        self._level_sp = Spinner(text='A1', values=LEVELS,
                                 size_hint_x=None, width=dp(80),
                                 background_normal='', background_color=(0.9, 0.9, 0.9, 1))
        lv_row.add_widget(self._level_sp)
        lv_row.add_widget(Label())
        form.add_widget(lv_row)

        cat_row = BoxLayout(size_hint_y=None, height=dp(38), spacing=dp(8))
        cat_row.add_widget(Label(text='Topic:', color=TEXT_DARK, font_size=dp(14),
                                 size_hint_x=None, width=dp(60)))
        self._cat_input = TextInput(hint_text='e.g. Food, Travel, Work…',
                                    size_hint_y=None, height=dp(36),
                                    multiline=False, font_size=dp(13))
        cat_row.add_widget(self._cat_input)
        form.add_widget(cat_row)

        cnt_row = BoxLayout(size_hint_y=None, height=dp(38), spacing=dp(8))
        cnt_row.add_widget(Label(text='Count:', color=TEXT_DARK, font_size=dp(14),
                                 size_hint_x=None, width=dp(60)))
        self._slider = Slider(min=3, max=20, value=5, step=1)
        self._cnt_lbl = Label(text='5', color=TEXT_DARK, font_size=dp(14),
                              size_hint_x=None, width=dp(30))
        self._slider.bind(value=lambda w, v: setattr(self._cnt_lbl, 'text', str(int(v))))
        cnt_row.add_widget(self._slider)
        cnt_row.add_widget(self._cnt_lbl)
        form.add_widget(cnt_row)

        form.add_widget(BoxLayout(size_hint_y=None, height=dp(4)))
        self._gen_btn = _rnd_btn('✦  Generate with AI', (0.23, 0.51, 0.96, 1), self._generate)
        form.add_widget(self._gen_btn)
        root.add_widget(form)

        self._status_lbl = Label(text='', color=TEXT_GREY, font_size=dp(12),
                                 size_hint_y=None, height=dp(22),
                                 halign='center', text_size=(None, None))
        self._status_lbl.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        root.add_widget(self._status_lbl)

        scroll = ScrollView()
        self._results = GridLayout(cols=1, spacing=dp(8), size_hint_y=None,
                                   padding=[0, 0, 0, dp(16)])
        self._results.bind(minimum_height=self._results.setter('height'))
        scroll.add_widget(self._results)
        root.add_widget(scroll)

        self.add_widget(root)

    def on_enter(self):
        self._refresh_banner()

    def _on_connectivity(self, online):
        self._refresh_banner()

    def _refresh_banner(self):
        if connectivity.is_online():
            self._banner.text = '🟢 Connected — AI generation available'
            self._banner.color = (0.13, 0.77, 0.37, 1)
            self._gen_btn.disabled = False
        else:
            self._banner.text = '⚫ Offline — connect to the API server to generate cards'
            self._banner.color = (0.6, 0.6, 0.6, 1)
            self._gen_btn.disabled = True

    def _generate(self):
        if not connectivity.is_online():
            self._status_lbl.text = 'Not connected to API server.'
            return

        level    = self._level_sp.text
        category = self._cat_input.text.strip() or None
        count    = int(self._slider.value)

        self._status_lbl.text = f'Generating {count} {level} cards…'
        self._results.clear_widgets()
        self._gen_btn.disabled = True

        def _run():
            try:
                from urllib import request as urllib_request
                from urllib.parse import urlencode
                body = json.dumps({"level": level, "count": count,
                                   **({"category": category} if category else {})}).encode()
                req = urllib_request.Request(
                    connectivity.API_BASE_URL + "/flashcards/generate",
                    data=body, method="POST")
                req.add_header("Content-Type", "application/json")
                with urllib_request.urlopen(req, timeout=60) as resp:
                    cards = json.loads(resp.read().decode("utf-8"))
                for card in cards:
                    local_storage.upsert_api_card(card)
                from kivy.clock import Clock
                Clock.schedule_once(lambda dt: self._on_done(cards), 0)
            except Exception as exc:
                err = str(exc)
                from kivy.clock import Clock
                Clock.schedule_once(lambda dt: self._on_error(err), 0)

        threading.Thread(target=_run, daemon=True).start()

    def _on_done(self, cards):
        self._gen_btn.disabled = False
        self._status_lbl.text = f'✓ {len(cards)} cards generated and saved!'
        self._results.clear_widgets()
        for card in cards:
            self._results.add_widget(GeneratedRow(card))

    def _on_error(self, msg):
        self._gen_btn.disabled = False
        self._status_lbl.text = f'Error: {msg}'
