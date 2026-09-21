import json
import os
import threading


class ConfigManager:

    def __init__(self, config_path="config/settings.json"):

        self.config_path = config_path

        self.lock = threading.Lock()

        self.config = self.load()

    def load(self):

        if not os.path.exists(self.config_path):

            raise FileNotFoundError(
                f"Configuration file not found: {self.config_path}"
            )

        with open(
            self.config_path,
            "r",
            encoding="utf-8"
        ) as file:

            return json.load(file)

    def get(self):

        with self.lock:

            return self.config.copy()

    def save(self, config):

        with self.lock:

            os.makedirs(
                os.path.dirname(self.config_path),
                exist_ok=True
            )

            with open(
                self.config_path,
                "w",
                encoding="utf-8"
            ) as file:

                json.dump(
                    config,
                    file,
                    indent=4,
                    ensure_ascii=False
                )

            self.config = config

    def get_store_name(self):

        with self.lock:

            return self.config.get(
                "store_name",
                "MiRen Next"
            )

    def get_logo(self):

        with self.lock:

            return self.config.get(
                "logo"
            )

    def get_message(self, message_key):

        with self.lock:

            return self.config.get(
                "messages",
                {}
            ).get(
                message_key,
                ""
            )

    def get_register(self, register):

        with self.lock:

            return self.config.get(
                "registers",
                {}
            ).get(
                str(register),
                {
                    "name": f"REGISTER {register}",
                    "audio": None
                }
            )

    def get_register_name(self, register):

        register_config = self.get_register(register)

        return register_config.get(
            "name",
            f"REGISTER {register}"
        )

    def get_register_audio(self, register):

        register_config = self.get_register(register)

        return register_config.get(
            "audio"
        )