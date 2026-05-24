import os
os.environ.setdefault('KIVY_NO_ENV_CONFIG', '1')

from kivy.app import App
from kivy.uix.screenmanager import ScreenManager, SlideTransition
from kivy.core.window import Window

Window.size = (420, 760)

import local_storage
import connectivity

from screens.dashboard import DashboardScreen
from screens.browse import BrowseScreen
from screens.study import StudyScreen
from screens.daily import DailyScreen
from screens.generate import GenerateScreen


class DeutschKartenApp(App):
    title = 'DeutschKarten'

    def build(self):
        local_storage.init_db()
        connectivity.check_connectivity(self._on_connectivity)

        sm = ScreenManager(transition=SlideTransition())
        sm.add_widget(DashboardScreen(name='dashboard'))
        sm.add_widget(BrowseScreen(name='browse'))
        sm.add_widget(StudyScreen(name='study'))
        sm.add_widget(DailyScreen(name='daily'))
        sm.add_widget(GenerateScreen(name='generate'))
        return sm

    def _on_connectivity(self, online):
        if online:
            connectivity.sync_online_cards()


if __name__ == '__main__':
    DeutschKartenApp().run()
