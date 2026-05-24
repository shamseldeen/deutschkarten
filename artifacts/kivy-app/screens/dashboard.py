from kivy.uix.screenmanager import Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.progressbar import ProgressBar
from kivy.graphics import Color, RoundedRectangle, Rectangle
from kivy.metrics import dp
from kivy.clock import Clock
import api_client
from utils import LEVELS, get_level_color, BG_COLOR, CARD_BG, TEXT_DARK, TEXT_GREY


def make_rounded_bg(widget, color):
    with widget.canvas.before:
        c = Color(*color)
        rr = RoundedRectangle(pos=widget.pos, size=widget.size, radius=[dp(12)])
    widget.bind(pos=lambda w, v: setattr(rr, 'pos', v),
                size=lambda w, v: setattr(rr, 'size', v))


class LevelCard(BoxLayout):
    def __init__(self, level, stats, on_study, **kwargs):
        super().__init__(orientation='vertical', padding=dp(14),
                         spacing=dp(6), size_hint_y=None, height=dp(110), **kwargs)
        color = get_level_color(level)
        make_rounded_bg(self, CARD_BG)

        top_row = BoxLayout(size_hint_y=None, height=dp(32))
        badge = Label(text=level, bold=True, color=(1, 1, 1, 1),
                      size_hint=(None, None), size=(dp(40), dp(26)))
        with badge.canvas.before:
            Color(*color)
            br = RoundedRectangle(pos=badge.pos, size=badge.size, radius=[dp(6)])
        badge.bind(pos=lambda w, v: setattr(br, 'pos', v),
                   size=lambda w, v: setattr(br, 'size', v))
        top_row.add_widget(badge)
        top_row.add_widget(Label())

        total = stats.get('total', 0)
        known = stats.get('known', 0)
        pct = stats.get('percentage', 0)

        info_lbl = Label(
            text=f"{known} / {total} known  ({pct}%)",
            color=TEXT_GREY, font_size=dp(13), size_hint_y=None, height=dp(20),
            halign='left', text_size=(None, None)
        )
        info_lbl.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))

        pb = ProgressBar(max=100, value=pct, size_hint_y=None, height=dp(10))

        study_btn = Button(text=f'Study {level}', size_hint_y=None, height=dp(36),
                           background_normal='', background_color=(0, 0, 0, 0),
                           color=(1, 1, 1, 1), bold=True, font_size=dp(13))
        study_btn.bind(on_release=lambda *a: on_study(level))
        with study_btn.canvas.before:
            Color(*color)
            sb_bg = RoundedRectangle(pos=study_btn.pos, size=study_btn.size,
                                     radius=[dp(8)])
        study_btn.bind(pos=lambda w, v: setattr(sb_bg, 'pos', v),
                       size=lambda w, v: setattr(sb_bg, 'size', v))

        self.add_widget(top_row)
        self.add_widget(info_lbl)
        self.add_widget(pb)
        self.add_widget(study_btn)


class DashboardScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._stats = {}
        self._build()

    def _build(self):
        with self.canvas.before:
            Color(*BG_COLOR)
            self._bg = Rectangle(pos=self.pos, size=self.size)
        self.bind(pos=lambda w, v: setattr(self._bg, 'pos', v),
                  size=lambda w, v: setattr(self._bg, 'size', v))

        root = BoxLayout(orientation='vertical', padding=dp(16), spacing=dp(12))

        # Header
        header = BoxLayout(size_hint_y=None, height=dp(56))
        title = Label(text='[b]DeutschKarten[/b]', markup=True,
                      font_size=dp(22), color=TEXT_DARK, halign='left',
                      text_size=(None, None))
        title.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        header.add_widget(title)
        root.add_widget(header)

        # Nav buttons
        nav = BoxLayout(size_hint_y=None, height=dp(46), spacing=dp(8))
        btns = [
            ('Daily Review', (0.23, 0.51, 0.96, 1), self.go_daily),
            ('Browse',       (0.13, 0.77, 0.37, 1), self.go_browse),
            ('Generate AI',  (0.86, 0.15, 0.15, 1), self.go_generate),
        ]
        for label, col, handler in btns:
            b = Button(text=label, background_normal='', background_color=(0, 0, 0, 0),
                       color=(1, 1, 1, 1), bold=True, font_size=dp(13))
            b.bind(on_release=lambda *a, h=handler: h())
            with b.canvas.before:
                Color(*col)
                b_bg = RoundedRectangle(pos=b.pos, size=b.size, radius=[dp(8)])
            b.bind(pos=lambda w, v, r=b_bg: setattr(r, 'pos', v),
                   size=lambda w, v, r=b_bg: setattr(r, 'size', v))
            nav.add_widget(b)
        root.add_widget(nav)

        # Section label
        sec = Label(text='Progress by Level', bold=True, color=TEXT_DARK,
                    font_size=dp(15), size_hint_y=None, height=dp(28),
                    halign='left', text_size=(None, None))
        sec.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        root.add_widget(sec)

        # Scrollable level cards
        scroll = ScrollView()
        self._card_list = GridLayout(cols=1, spacing=dp(10), size_hint_y=None,
                                     padding=[0, 0, 0, dp(16)])
        self._card_list.bind(minimum_height=self._card_list.setter('height'))
        scroll.add_widget(self._card_list)
        root.add_widget(scroll)

        self.add_widget(root)

    def on_enter(self):
        self._load_stats()

    def _load_stats(self):
        api_client.get_stats(callback=self._on_stats, error_callback=self._on_error)

    def _on_stats(self, data):
        self._stats = {s['level']: s for s in data}
        self._card_list.clear_widgets()
        for level in LEVELS:
            stats = self._stats.get(level, {'total': 0, 'known': 0,
                                            'unknown': 0, 'percentage': 0})
            card = LevelCard(level, stats, on_study=self.go_study)
            self._card_list.add_widget(card)

    def _on_error(self, msg):
        self._card_list.clear_widgets()
        self._card_list.add_widget(
            Label(text=f'Could not reach API server.\n{msg}\n\nCheck config.json',
                  color=(0.8, 0.2, 0.2, 1), halign='center',
                  size_hint_y=None, height=dp(80))
        )

    def go_study(self, level):
        self.manager.get_screen('study').set_level(level)
        self.manager.current = 'study'

    def go_daily(self):
        self.manager.current = 'daily'

    def go_browse(self):
        self.manager.current = 'browse'

    def go_generate(self):
        self.manager.current = 'generate'
