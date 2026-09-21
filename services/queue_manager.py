from collections import deque


class QueueManager:
    def __init__(self, call_duration=8, register_count=8):
        self.queue = deque()
        self.current_register = None
        self.call_duration = call_duration
        self.register_count = register_count

    def request_register(self, register):
        if register < 1 or register > self.register_count:
            raise ValueError(
                f"Register must be between 1 and {self.register_count}"
            )

        # Do not add the register if it is already being called
        if register == self.current_register:
            return False

        # Do not add duplicate register to queue
        if register in self.queue:
            return False

        self.queue.append(register)

        # If nobody is currently being called,
        # immediately call the first register.
        if self.current_register is None:
            self.call_next()

        return True

    def call_next(self):
        if self.current_register is not None:
            return self.current_register

        if not self.queue:
            return None

        self.current_register = self.queue.popleft()

        return self.current_register

    def complete_current(self):
        if self.current_register is None:
            return None

        completed = self.current_register

        self.current_register = None

        next_register = self.call_next()

        return {
            "completed": completed,
            "next": next_register
        }

    def get_status(self):
        return {
            "current_register": self.current_register,
            "queue": list(self.queue),
            "call_duration": self.call_duration,
            "register_count": self.register_count
        }

    def clear(self):
        self.current_register = None
        self.queue.clear()