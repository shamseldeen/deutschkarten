from kivy.uix.screenmanager import Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.gridlayout import GridLayout
from kivy.uix.scrollview import ScrollView
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.progressbar import ProgressBar
from kivy.graphics import Color, RoundedRectangle, Rectangle
from kivy.metrics import dp
import local_storage
import connectivity
from utils import LEVELS, get_level_color, BG_COLOR, CARD_BG, TEXT_DARK, TEXT_GREY


def _rnd_bg(widget, color, radius=dp(12)):
    with widget.canvas.before:
        c = Color(*color)
        rr = RoundedRectangle(pos=widget.pos, size=widget.size, radius=[radius])
    widget.bind(pos=lambda w, v: setattr(rr, 'pos', v),
                size=lambda w, v: setattr(rr, 'size', v))


def _action_btn(text, color, handler):
    b = Button(text=text, background_normal='', background_color=(0, 0, 0, 0),
               color=(1, 1, 1, 1), bold=True, font_size=dp(13))
    b.bind(on_release=lambda *a: handler())
    _rnd_bg(b, color, radius=dp(8))
    return b


class LevelCard(BoxLayout):
    def __init__(self, level, stats, on_study, **kwargs):
        super().__init__(orientation='vertical', padding=dp(14),
                         spacing=dp(6), size_hint_y=None, height=dp(110), **kwargs)
        color = get_level_color(level)
        _rnd_bg(self, CARD_BG)

        top = BoxLayout(size_hint_y=None, height=dp(30))
        badge = Label(text=level, bold=True, color=(1, 1, 1, 1),
                      size_hint=(None, None), size=(dp(40), dp(24)))
        _rnd_bg(badge, color, radius=dp(6))
        cat_lbl = Label(text=f"{stats.get('total', 0)} cards", color=TEXT_GREY,
                        font_size=dp(12), halign='right', text_size=(None, None))
        cat_lbl.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        top.add_widget(badge)
        top.add_widget(cat_lbl)
        self.add_widget(top)

        known = stats.get('known', 0)
        total = stats.get('total', 0)
        pct = stats.get('percentage', 0)
        info = Label(text=f"{known} / {total} known  ({pct}%)",
                     color=TEXT_GREY, font_size=dp(12),
                     size_hint_y=None, height=dp(18),
                     halign='left', text_size=(None, None))
        info.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self.add_widget(info)

        pb = ProgressBar(max=100, value=pct, size_hint_y=None, height=dp(10))
        self.add_widget(pb)

        btn = Button(text=f'Study {level}', size_hint_y=None, height=dp(34),
                     background_normal='', background_color=(0, 0, 0, 0),
                     color=(1, 1, 1, 1), bold=True, font_size=dp(13))
        btn.bind(on_release=lambda *a: on_study(level))
        _rnd_bg(btn, color, radius=dp(8))
        self.add_widget(btn)


class DashboardScreen(Screen):
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

        # Header row
        header = BoxLayout(size_hint_y=None, height=dp(52))
        title = Label(text='[b]DeutschKarten[/b]', markup=True,
                      font_size=dp(22), color=TEXT_DARK,
                      halign='left', text_size=(None, None))
        title.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self._status_dot = Label(text='⚫ offline', color=(0.6, 0.6, 0.6, 1),
                                 font_size=dp(11), size_hint_x=None, width=dp(80),
                                 halign='right', text_size=(None, None))
        self._status_dot.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        header.add_widget(title)
        header.add_widget(self._status_dot)
        root.add_widget(header)

        # Nav buttons
        nav = BoxLayout(size_hint_y=None, height=dp(46), spacing=dp(8))
        nav.add_widget(_action_btn('Daily Review', (0.23, 0.51, 0.96, 1), self.go_daily))
        nav.add_widget(_action_btn('Browse',       (0.13, 0.77, 0.37, 1), self.go_browse))
        nav.add_widget(_action_btn('Generate AI',  (0.86, 0.15, 0.15, 1), self.go_generate))
        root.add_widget(nav)

        sec = Label(text='Progress by Level', bold=True, color=TEXT_DARK,
                    font_size=dp(15), size_hint_y=None, height=dp(28),
                    halign='left', text_size=(None, None))
        sec.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        root.add_widget(sec)

        scroll = ScrollView()
        self._card_list = GridLayout(cols=1, spacing=dp(10), size_hint_y=None,
                                     padding=[0, 0, 0, dp(16)])
        self._card_list.bind(minimum_height=self._card_list.setter('height'))
        scroll.add_widget(self._card_list)
        root.add_widget(scroll)

        self.add_widget(root)

    def on_enter(self):
        self._reload()

    def _reload(self):
        stats_list = local_storage.get_stats()
        self._card_list.clear_widgets()
        for s in stats_list:
            self._card_list.add_widget(
                LevelCard(s['level'], s, on_study=self.go_study))

    def _on_connectivity(self, online):
        if online:
            self._status_dot.text = '🟢 online'
            self._status_dot.color = (0.13, 0.77, 0.37, 1)
            self._reload()
        else:
            self._status_dot.text = '⚫ offline'
            self._status_dot.color = (0.6, 0.6, 0.6, 1)

    def go_study(self, level):
        self.manager.get_screen('study').set_level(level)
        self.manager.current = 'study'

    def go_daily(self):    self.manager.current = 'daily'
    def go_browse(self):   self.manager.current = 'browse'
    def go_generate(self): self.manager.current = 'generate'
