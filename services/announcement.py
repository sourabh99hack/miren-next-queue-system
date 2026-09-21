import os
import shutil
import subprocess
import threading


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

    def announce_register(self, register):

        # Stop any previous announcement
        self.stop_current_announcement()

        audio_filename = (
            self.config_manager.get_register_audio(
                register
            )
        )

        if audio_filename:

            audio_path = os.path.join(
                self.audio_folder,
                audio_filename
            )

            if os.path.exists(audio_path):

                if shutil.which("afplay"):

                    with self.process_lock:
                        self.current_process = subprocess.Popen(
                            ["afplay", audio_path]
                        )

                    return

        # No custom audio → configured TTS
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

        if shutil.which("say"):

            with self.process_lock:
                self.current_process = subprocess.Popen(
                    ["say", message]
                )