import threading
import json
from datetime import datetime
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
from kivy.clock import Clock
import local_storage
import connectivity
from utils import LEVELS, get_level_color, get_article_color, BG_COLOR, CARD_BG, TEXT_DARK, TEXT_GREY, ar_text, FONT_ARABIC, FONT_EMOJI


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
        ar = Label(text=ar_text(card.get('arabicTranslation', '')),
                   font_name=FONT_ARABIC, color=TEXT_GREY,
                   font_size=dp(12), halign='right', text_size=(None, None))
        ar.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self.add_widget(ar)


class GenerateScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._resets_at = None
        self._countdown_event = None
        self._limit_status = None
        self._build()
        connectivity.add_listener(self._on_connectivity)

    def _build(self):
        with self.canvas.before:
            Color(*BG_COLOR)
            self._bg = Rectangle(pos=self.pos, size=self.size)
        self.bind(pos=lambda w, v: setattr(self._bg, 'pos', v),
                  size=lambda w, v: setattr(self._bg, 'size', v))

        self._root = BoxLayout(orientation='vertical', padding=dp(16), spacing=dp(12))

        # Top bar
        top = BoxLayout(size_hint_y=None, height=dp(46))
        back = Button(text='← Back', background_normal='',
                      background_color=(0.7, 0.7, 0.7, 1), color=(1, 1, 1, 1),
                      bold=True, font_size=dp(13), size_hint_x=None, width=dp(80))
        back.bind(on_release=lambda *a: setattr(self.manager, 'current', 'dashboard'))
        title = Label(text='Generate AI Cards', bold=True, color=TEXT_DARK, font_size=dp(17))
        top.add_widget(back)
        top.add_widget(title)
        self._root.add_widget(top)

        # Free-tier info banner
        self._banner_box = BoxLayout(size_hint_y=None, height=dp(48),
                                     padding=[dp(12), dp(8)])
        with self._banner_box.canvas.before:
            Color(0.94, 0.97, 1, 1)
            self._bb_bg = RoundedRectangle(pos=self._banner_box.pos,
                                           size=self._banner_box.size, radius=[dp(10)])
        self._banner_box.bind(pos=lambda w, v: setattr(self._bb_bg, 'pos', v),
                              size=lambda w, v: setattr(self._bb_bg, 'size', v))
        self._banner_lbl = Label(text='✦  Free AI generation — up to 3 per day',
                                 color=(0.12, 0.25, 0.61, 1), font_size=dp(12),
                                 halign='left', text_size=(None, None))
        self._banner_lbl.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self._banner_box.add_widget(self._banner_lbl)
        self._root.add_widget(self._banner_box)

        # Connectivity status
        self._conn_lbl = Label(text='', font_size=dp(12),
                               size_hint_y=None, height=dp(20),
                               halign='center', text_size=(None, None))
        self._conn_lbl.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self._root.add_widget(self._conn_lbl)

        # The content area switches between form and blocked view
        self._content_area = BoxLayout(orientation='vertical')
        self._root.add_widget(self._content_area)
        self._build_form()

        # Results list
        scroll = ScrollView()
        self._results = GridLayout(cols=1, spacing=dp(8), size_hint_y=None,
                                   padding=[0, 0, 0, dp(16)])
        self._results.bind(minimum_height=self._results.setter('height'))
        scroll.add_widget(self._results)
        self._root.add_widget(scroll)

        self.add_widget(self._root)

    def _build_form(self):
        self._content_area.clear_widgets()

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
        self._content_area.add_widget(form)

        self._status_lbl = Label(text='', color=TEXT_GREY, font_size=dp(12),
                                 size_hint_y=None, height=dp(22),
                                 halign='center', text_size=(None, None))
        self._status_lbl.bind(size=lambda w, v: setattr(w, 'text_size', (v[0], None)))
        self._content_area.add_widget(self._status_lbl)

    def _build_blocked_view(self):
        self._content_area.clear_widgets()

        blocked = BoxLayout(orientation='vertical', padding=dp(20), spacing=dp(10),
                            size_hint_y=None, height=dp(260))
        with blocked.canvas.before:
            Color(1.0, 0.95, 0.95, 1)
            b_bg = RoundedRectangle(pos=blocked.pos, size=blocked.size, radius=[dp(14)])
        blocked.bind(pos=lambda w, v: setattr(b_bg, 'pos', v),
                     size=lambda w, v: setattr(b_bg, 'size', v))

        blocked.add_widget(Label(text='[ TIME LIMIT ]', bold=True,
                                 color=(0.72, 0.11, 0.11, 0.5),
                                 font_size=dp(14), size_hint_y=None, height=dp(28)))
        blocked.add_widget(Label(text='Daily limit reached',
                                 bold=True, font_size=dp(18),
                                 color=(0.72, 0.11, 0.11, 1),
                                 size_hint_y=None, height=dp(28)))

        limit = self._limit_status.get('limit', 3) if self._limit_status else 3
        blocked.add_widget(Label(
            text=f"You've used all {limit} free AI generations for today.",
            color=(0.85, 0.20, 0.20, 1), font_size=dp(13),
            halign='center', text_size=(None, None),
            size_hint_y=None, height=dp(24)))

        # Countdown box
        cd_box = BoxLayout(orientation='vertical', size_hint_y=None, height=dp(70),
                           padding=[dp(10), dp(8)])
        with cd_box.canvas.before:
            Color(1, 1, 1, 1)
            cd_bg = RoundedRectangle(pos=cd_box.pos, size=cd_box.size, radius=[dp(10)])
        cd_box.bind(pos=lambda w, v: setattr(cd_bg, 'pos', v),
                    size=lambda w, v: setattr(cd_bg, 'size', v))
        cd_box.add_widget(Label(text='NEXT GENERATION IN',
                                color=(0.85, 0.20, 0.20, 0.7), font_size=dp(10),
                                bold=True, size_hint_y=None, height=dp(18)))
        self._countdown_lbl = Label(text='—', bold=True, font_size=dp(28),
                                    color=(0.72, 0.11, 0.11, 1),
                                    size_hint_y=None, height=dp(36))
        cd_box.add_widget(self._countdown_lbl)
        blocked.add_widget(cd_box)

        blocked.add_widget(Label(
            text='Keep studying your existing cards while you wait!',
            color=TEXT_GREY, font_size=dp(12), halign='center',
            text_size=(None, None), size_hint_y=None, height=dp(20)))

        self._content_area.add_widget(blocked)
        self._start_countdown()

    def _start_countdown(self):
        if self._countdown_event:
            self._countdown_event.cancel()
        self._countdown_event = Clock.schedule_interval(self._tick_countdown, 1)

    def _tick_countdown(self, dt):
        if not self._resets_at:
            return
        try:
            reset_dt = datetime.fromisoformat(self._resets_at.replace('Z', '+00:00'))
            from datetime import timezone
            now = datetime.now(timezone.utc)
            diff = (reset_dt - now).total_seconds()
            if diff <= 0:
                if self._countdown_event:
                    self._countdown_event.cancel()
                self._resets_at = None
                self._build_form()
                self._fetch_status()
                return
            h = int(diff // 3600)
            m = int((diff % 3600) // 60)
            s = int(diff % 60)
            if hasattr(self, '_countdown_lbl'):
                self._countdown_lbl.text = f'{h}h {m:02d}m {s:02d}s'
        except Exception:
            pass

    def on_enter(self):
        self._refresh_banner()
        self._fetch_status()

    def on_leave(self):
        if self._countdown_event:
            self._countdown_event.cancel()

    def _on_connectivity(self, online):
        self._refresh_banner()

    def _refresh_banner(self):
        if connectivity.is_online():
            self._conn_lbl.text = '● Connected — AI generation available'
            self._conn_lbl.color = (0.13, 0.77, 0.37, 1)
        else:
            self._conn_lbl.text = '● Offline — connect to the API server to generate cards'
            self._conn_lbl.color = (0.6, 0.6, 0.6, 1)

    def _fetch_status(self):
        def _run():
            try:
                from urllib import request as urllib_request
                req = urllib_request.Request(
                    connectivity.API_BASE_URL + "/flashcards/generate/status")
                req.add_header("Accept", "application/json")
                with urllib_request.urlopen(req, timeout=6) as resp:
                    data = json.loads(resp.read().decode())
                Clock.schedule_once(lambda dt: self._on_status(data), 0)
            except Exception:
                pass
        threading.Thread(target=_run, daemon=True).start()

    def _on_status(self, data):
        self._limit_status = data
        remaining = data.get('remaining', 1)
        limit = data.get('limit', 3)
        used = data.get('used', 0)
        resets_at = data.get('resetsAt', '')
        self._banner_lbl.text = (
            f'✦  Free AI generation — {remaining} of {limit} remaining today'
        )
        if remaining == 0:
            self._resets_at = resets_at
            self._build_blocked_view()
        else:
            if self._countdown_event:
                self._countdown_event.cancel()

    def _generate(self):
        if not connectivity.is_online():
            if hasattr(self, '_status_lbl'):
                self._status_lbl.text = 'Not connected to API server.'
            return

        level    = self._level_sp.text
        category = self._cat_input.text.strip() or None
        count    = int(self._slider.value)

        if hasattr(self, '_status_lbl'):
            self._status_lbl.text = f'Generating {count} {level} cards…'
        self._results.clear_widgets()
        self._gen_btn.disabled = True

        def _run():
            try:
                from urllib import request as urllib_request
                body = json.dumps({"level": level, "count": count,
                                   **({"category": category} if category else {})}).encode()
                req = urllib_request.Request(
                    connectivity.API_BASE_URL + "/flashcards/generate",
                    data=body, method="POST")
                req.add_header("Content-Type", "application/json")
                with urllib_request.urlopen(req, timeout=60) as resp:
                    cards = json.loads(resp.read().decode())
                for card in cards:
                    local_storage.upsert_api_card(card)
                Clock.schedule_once(lambda dt: self._on_done(cards), 0)
            except Exception as exc:
                from urllib.error import HTTPError
                err_body = {}
                if isinstance(exc, HTTPError):
                    try:
                        err_body = json.loads(exc.read().decode())
                    except Exception:
                        pass
                err_str = str(exc)
                Clock.schedule_once(lambda dt: self._on_error(err_str, err_body), 0)

        threading.Thread(target=_run, daemon=True).start()

    def _on_done(self, cards):
        self._gen_btn.disabled = False
        if hasattr(self, '_status_lbl'):
            self._status_lbl.text = f'✓ {len(cards)} cards generated and saved!'
        self._results.clear_widgets()
        for card in cards:
            self._results.add_widget(GeneratedRow(card))
        self._fetch_status()

    def _on_error(self, msg, body=None):
        self._gen_btn.disabled = False
        body = body or {}
        if body.get('resetsAt') or '429' in msg:
            self._resets_at = body.get('resetsAt')
            self._limit_status = body
            self._build_blocked_view()
        else:
            if hasattr(self, '_status_lbl'):
                self._status_lbl.text = f'Error: {msg}'
        self._fetch_status()
