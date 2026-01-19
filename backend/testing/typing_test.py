from pynput import keyboard
import time

class TypingDetector:
    """
    Cool working script, but need to detect whether the user is typing rather than 
    """
    def __init__(self):
        self.pressed_keys = {}
        self.listener = keyboard.Listener(
            on_press=self.on_press,
            on_release=self.on_release)

    def on_press(self, key):
        if key not in self.pressed_keys:
            self.pressed_keys[key] = time.time()
            print(f'{key} is pressed')
    
    def on_release(self, key):
        if key in self.pressed_keys:
            timer = time.time() - self.pressed_keys[key]
            del self.pressed_keys[key]
            print(f'{key} is released, held for {timer} number of seconds')
        if key == keyboard.Key.esc:
            return False

if __name__ == "__main__":
    detector = TypingDetector()
    detector.listener.start()
    detector.listener.join()