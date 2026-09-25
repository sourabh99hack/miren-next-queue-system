import os
import shutil
import subprocess
import threading
import platform


class AnnouncementService:

    def __init__(self, config_manager, audio_folder):
        self.config_manager = config_manager
        self.audio_folder = audio_folder

        self.current_process = None
        self.process_lock = threading.Lock()

    def stop_current_announcement(self):

        with self.process_lock:

            if self.current_process is not None:

                if self.current_process.poll() is None:
                    self.current_process.terminate()

                self.current_process = None

    def get_audio_player(self):

        system = platform.system()

        # macOS
        if system == "Darwin":
            if shutil.which("afplay"):
                return ["afplay"]

        # Linux / Raspberry Pi
        elif system == "Linux":
            if shutil.which("pw-play"):
                return ["pw-play"]

            # Fallback
            if shutil.which("paplay"):
                return ["paplay"]

            if shutil.which("cvlc"):
                return ["cvlc", "--play-and-exit"]

        return None

    def announce_register(self, register):

        # Stop any previous announcement
        self.stop_current_announcement()

        audio_filename = (
            self.config_manager.get_register_audio(
                register
            )
        )

        # =========================================
        # CUSTOM AUDIO
        # =========================================

        if audio_filename:

            audio_path = os.path.join(
                self.audio_folder,
                audio_filename
            )

            if os.path.exists(audio_path):

                player = self.get_audio_player()

                if player:

                    command = player + [audio_path]

                    print(
                        f"Playing announcement: {' '.join(command)}"
                    )

                    with self.process_lock:
                        self.current_process = (
                            subprocess.Popen(command)
                        )

                    return

                print(
                    "No supported audio player found."
                )

        # =========================================
        # FALLBACK TTS
        # =========================================

        proceed_message = (
            self.config_manager.get_message(
                "proceed"
            )
        )

        register_name = (
            self.config_manager.get_register_name(
                register
            )
        )

        if proceed_message:
            message = f"{proceed_message} {register_name}"
        else:
            message = (
                f"Please proceed to register {register}"
            )

        system = platform.system()

        # macOS TTS
        if system == "Darwin":

            if shutil.which("say"):

                print(f"Speaking: {message}")

                with self.process_lock:
                    self.current_process = (
                        subprocess.Popen(
                            ["say", message]
                        )
                    )

                return

        # Linux / Raspberry Pi TTS
        elif system == "Linux":

            if shutil.which("espeak-ng"):

                print(f"Speaking: {message}")

                with self.process_lock:
                    self.current_process = (
                        subprocess.Popen(
                            ["espeak-ng", message]
                        )
                    )

                return

        print(
            "No supported TTS engine found."
        )