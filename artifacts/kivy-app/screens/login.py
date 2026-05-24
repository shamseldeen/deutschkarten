from kivy.uix.screenmanager import Screen
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.label import Label
from kivy.uix.button import Button
from kivy.uix.textinput import TextInput
from kivy.graphics import Color, RoundedRectangle, Rectangle
from kivy.metrics import dp

import auth
import sync
from utils import BG_COLOR, CARD_BG, TEXT_DARK, TEXT_GREY


def _rnd_bg(widget, color, radius=dp(10)):
    with widget.canvas.before:
        Color(*color)
        rr = RoundedRectangle(pos=widget.pos, size=widget.size, radius=[radius])
    widget.bind(pos=lambda w, v: setattr(rr, 'pos', v),
                size=lambda w, v: setattr(rr, 'size', v))


class LoginScreen(Screen):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._mode = 'sign-in'  # or 'sign-up'
        self._build()

    def _build(self):
        with self.canvas.before:
            Color(*BG_COLOR)
            self._bg = Rectangle(pos=self.pos, size=self.size)
        self.bind(pos=lambda w, v: setattr(self._bg, 'pos', v),
                  size=lambda w, v: setattr(self._bg, 'size', v))

        root = BoxLayout(orientation='vertical', padding=dp(24), spacing=dp(12))

        title = Label(text='[b]Ba7r DeutschKarten[/b]', markup=True,
                      font_size=dp(22), color=TEXT_DARK,
                      size_hint_y=None, height=dp(36))
        root.add_widget(title)

        self._mode_lbl = Label(text='Sign in to sync your progress',
                               color=TEXT_GREY, font_size=dp(13),
                               size_hint_y=None, height=dp(22))
        root.add_widget(self._mode_lbl)

        card = BoxLayout(orientation='vertical', padding=dp(16),
                         spacing=dp(10), size_hint_y=None, height=dp(280))
        _rnd_bg(card, CARD_BG, radius=dp(14))

        self._email = TextInput(hint_text='Email', multiline=False,
                                size_hint_y=None, height=dp(40),
                                font_size=dp(14), padding=[dp(10), dp(10)])
        self._password = TextInput(hint_text='Password (min 8 chars)',
                                   password=True, multiline=False,
                                   size_hint_y=None, height=dp(40),
                                   font_size=dp(14), padding=[dp(10), dp(10)])
        card.add_widget(self._email)
        card.add_widget(self._password)

        self._submit = Button(text='Sign in', size_hint_y=None, height=dp(44),
                              background_normal='', background_color=(0, 0, 0, 0),
                              color=(1, 1, 1, 1), bold=True, font_size=dp(14))
        self._submit.bind(on_release=lambda *a: self._submit_form())
        _rnd_bg(self._submit, (0.23, 0.51, 0.96, 1), radius=dp(8))
        card.add_widget(self._submit)

        self._toggle = Button(text="New here? Create an account",
                              size_hint_y=None, height=dp(34),
                              background_normal='', background_color=(0, 0, 0, 0),
                              color=(0.23, 0.51, 0.96, 1), font_size=dp(12))
        self._toggle.bind(on_release=lambda *a: self._toggle_mode())
        card.add_widget(self._toggle)

        self._skip = Button(text='Continue offline (skip)',
                            size_hint_y=None, height=dp(30),
                            background_normal='', background_color=(0, 0, 0, 0),
                            color=TEXT_GREY, font_size=dp(11))
        self._skip.bind(on_release=lambda *a: self._goto_dashboard())
        card.add_widget(self._skip)

        self._status = Label(text='', color=(0.86, 0.15, 0.15, 1),
                             font_size=dp(12), size_hint_y=None, height=dp(20))
        card.add_widget(self._status)

        root.add_widget(card)
        root.add_widget(Label())  # spacer
        self.add_widget(root)

    def _toggle_mode(self):
        if self._mode == 'sign-in':
            self._mode = 'sign-up'
            self._submit.text = 'Create account'
            self._toggle.text = 'Have an account? Sign in'
            self._mode_lbl.text = 'Create an account to sync across devices'
        else:
            self._mode = 'sign-in'
            self._submit.text = 'Sign in'
            self._toggle.text = "New here? Create an account"
            self._mode_lbl.text = 'Sign in to sync your progress'
        self._status.text = ''

    def _submit_form(self):
        email = (self._email.text or '').strip()
        password = self._password.text or ''
        if not email or len(password) < 8:
            self._status.text = 'Enter email and 8+ char password.'
            return
        self._status.color = TEXT_GREY
        self._status.text = 'Working...'
        self._submit.disabled = True

        def on_ok(_data):
            self._submit.disabled = False
            self._status.color = (0.13, 0.77, 0.37, 1)
            self._status.text = 'Signed in. Syncing...'
            sync.full_sync(on_done=lambda _m: self._goto_dashboard())

        def on_err(msg):
            self._submit.disabled = False
            self._status.color = (0.86, 0.15, 0.15, 1)
            self._status.text = msg or 'Failed.'

        if self._mode == 'sign-in':
            auth.sign_in(email, password, on_ok, on_err)
        else:
            auth.sign_up(email, password, on_ok, on_err)

    def _goto_dashboard(self):
        self.manager.current = 'dashboard'
