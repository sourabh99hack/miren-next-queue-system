import lgpio
import threading
import time


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

        self.on_register_pressed = (
            on_register_pressed
        )

        self.handle = None
        self.running = False
        self.thread = None

        self.previous_states = {}

    def start(self):

        if self.running:
            return

        print("Starting GPIO controller...")

        self.handle = lgpio.gpiochip_open(
            self.CHIP
        )

        # Configure all GPIOs
        for register, gpio in self.GPIO_REGISTERS.items():

            lgpio.gpio_claim_input(
                self.handle,
                gpio,
                lgpio.SET_PULL_UP
            )

            state = lgpio.gpio_read(
                self.handle,
                gpio
            )

            self.previous_states[gpio] = state

            print(
                f"Register {register}: "
                f"GPIO{gpio} monitoring started"
            )

        self.running = True

        # Start background monitoring
        self.thread = threading.Thread(
            target=self._monitor_buttons,
            daemon=True
        )

        self.thread.start()

        print("GPIO controller started.")

    def _monitor_buttons(self):

        while self.running:

            for register, gpio in (
                self.GPIO_REGISTERS.items()
            ):

                try:

                    current_state = (
                        lgpio.gpio_read(
                            self.handle,
                            gpio
                        )
                    )

                    previous_state = (
                        self.previous_states[gpio]
                    )

                    # HIGH -> LOW means button pressed
                    if (
                        previous_state == 1
                        and current_state == 0
                    ):

                        print(
                            f"Physical button pressed: "
                            f"Register {register} "
                            f"(GPIO{gpio})"
                        )

                        try:

                            self.on_register_pressed(
                                register
                            )

                        except Exception as error:

                            print(
                                f"Error processing "
                                f"Register {register}: "
                                f"{error}"
                            )

                    self.previous_states[gpio] = (
                        current_state
                    )

                except Exception as error:

                    print(
                        f"GPIO{gpio} read error: "
                        f"{error}"
                    )

            # 20ms polling interval
            time.sleep(0.02)

    def stop(self):

        if not self.running:
            return

        print("Stopping GPIO controller...")

        self.running = False

        if self.thread is not None:
            self.thread.join(
                timeout=1
            )
            self.thread = None

        if self.handle is not None:

            for gpio in (
                self.GPIO_REGISTERS.values()
            ):

                try:
                    lgpio.gpio_free(
                        self.handle,
                        gpio
                    )
                except Exception:
                    pass

            lgpio.gpiochip_close(
                self.handle
            )

            self.handle = None

        self.previous_states.clear()

        print("GPIO controller stopped.")