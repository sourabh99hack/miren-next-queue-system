import lgpio
import threading


class GPIOController:

    CHIP = 15

    GPIO_REGISTERS = {
        1: 4,
        2: 17,
        3: 18,
        4: 22,
        5: 23,
        6: 24,
        7: 25,
        8: 27,
    }

    def __init__(self, on_register_pressed):
        self.on_register_pressed = on_register_pressed

        self.handle = None
        self.callbacks = []
        self.running = False

    def start(self):
        if self.running:
            return

        print("Starting GPIO controller...")

        self.handle = lgpio.gpiochip_open(self.CHIP)

        for register, gpio in self.GPIO_REGISTERS.items():

            # GPIO input with pull-up
            lgpio.gpio_claim_alert(
                self.handle,
                gpio,
                lgpio.FALLING_EDGE,
                lgpio.SET_PULL_UP
            )

            # Debounce: 100 ms
            lgpio.gpio_set_debounce_micros(
                self.handle,
                gpio,
                100000
            )

            callback = lgpio.callback(
                self.handle,
                gpio,
                lgpio.FALLING_EDGE,
                self._button_callback
            )

            self.callbacks.append(callback)

            print(
                f"Register {register}: "
                f"GPIO{gpio} monitoring started"
            )

        self.running = True

        print("GPIO controller started.")

    def _button_callback(self, gpio, level, timestamp):

        if level != 0:
            return

        register = self._get_register_from_gpio(gpio)

        if register is None:
            return

        print(
            f"Physical button pressed: "
            f"Register {register} "
            f"(GPIO{gpio})"
        )

        try:
            self.on_register_pressed(register)

        except Exception as error:
            print(
                f"Error processing Register {register}: "
                f"{error}"
            )

    def _get_register_from_gpio(self, gpio):

        for register, register_gpio in self.GPIO_REGISTERS.items():

            if register_gpio == gpio:
                return register

        return None

    def stop(self):

        if not self.running:
            return

        print("Stopping GPIO controller...")

        for callback in self.callbacks:
            try:
                callback.cancel()
            except Exception:
                pass

        self.callbacks.clear()

        if self.handle is not None:

            for gpio in self.GPIO_REGISTERS.values():
                try:
                    lgpio.gpio_free(
                        self.handle,
                        gpio
                    )
                except Exception:
                    pass

            lgpio.gpiochip_close(self.handle)
            self.handle = None

        self.running = False

        print("GPIO controller stopped.")