from pynput import keyboard
import time

class TypingDetector:
    """
    TODO: The current listener does not detect when a key is held down. 
    """
    def __init__(self):
        self.pressed_keys = set()
        self.listener = keyboard.Listener(
            on_press=self.on_press,
            on_release=self.on_release)

    def on_press(self, key):
        if key not in self.
    
    def on_release(self, key):
        print('{0} released'.format(
            key))
        if key == keyboard.Key.esc:
            return False

if __name__ == "__main__":
    detector = TypingDetector()
    detector.listener.start()
    detector.listener.join()