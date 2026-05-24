import os
os.environ.setdefault('KIVY_NO_ENV_CONFIG', '1')

from kivy.app import App
from kivy.uix.screenmanager import ScreenManager, SlideTransition
from kivy.core.window import Window
from kivy.metrics import dp

Window.size = (420, 760)

from screens.dashboard import DashboardScreen
from screens.browse import BrowseScreen
from screens.study import StudyScreen
from screens.daily import DailyScreen
from screens.generate import GenerateScreen


class DeutschKartenApp(App):
    title = 'DeutschKarten'

    def build(self):
        sm = ScreenManager(transition=SlideTransition())
        sm.add_widget(DashboardScreen(name='dashboard'))
        sm.add_widget(BrowseScreen(name='browse'))
        sm.add_widget(StudyScreen(name='study'))
        sm.add_widget(DailyScreen(name='daily'))
        sm.add_widget(GenerateScreen(name='generate'))
        return sm


if __name__ == '__main__':
    DeutschKartenApp().run()
