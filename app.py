from flask import (
    Flask,
    jsonify,
    render_template,
    request,
    redirect,
    url_for,
    session,
    send_from_directory
)
from functools import wraps
from services.queue_manager import QueueManager
from services.announcement import AnnouncementService
from services.config_manager import ConfigManager
from werkzeug.utils import secure_filename
import os
import threading
import time

ADMIN_PASSWORD = "admin123"
app = Flask(__name__)
app.secret_key = "miren-next-change-this-secret-key"
call_id = 0
timer_end_time = None

BASE_DIR = os.path.dirname(
    os.path.abspath(__file__)
)

LOGO_FOLDER = os.path.join(
    BASE_DIR,
    "config",
    "logo"
)

os.makedirs(
    LOGO_FOLDER,
    exist_ok=True
)

ALLOWED_LOGO_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg"
}

AUDIO_FOLDER = os.path.join(BASE_DIR, "config", "audio")
os.makedirs(AUDIO_FOLDER, exist_ok=True)
ALLOWED_AUDIO_EXTENSIONS = {"mp3"}

queue_manager = QueueManager(call_duration=8, register_count=8)
config_manager = ConfigManager()
timer_lock = threading.Lock()
announcement_service = AnnouncementService(
    config_manager,
    AUDIO_FOLDER
)

# Admin required function
def admin_required(function):

    @wraps(function)
    def decorated_function(*args, **kwargs):

        if not session.get("admin_logged_in"):

            return redirect(
                url_for("admin_login")
            )

        return function(*args, **kwargs)

    return decorated_function

@app.route("/api/config", methods=["GET"])
def get_config():

    return jsonify(
        config_manager.get()
    )

@app.route("/api/config", methods=["POST"])
@admin_required
def save_config():

    config = request.get_json()

    if not config:

        return jsonify({
            "success": False,
            "error": "No configuration provided."
        }), 400


    try:

        config_manager.save(
            config
        )

        return jsonify({
            "success": True,
            "message": "Configuration saved."
        })

    except Exception as error:

        return jsonify({
            "success": False,
            "error": str(error)
        }), 500

@app.route("/")
def home():
    return "Next Cashier is running!"


@app.route("/display")
def display():
    return render_template("display.html")


@app.route("/simulator")
def simulator():
    return render_template("simulator.html")


@app.route("/api/status", methods=["GET"])
def get_status():

    with timer_lock:

        if timer_end_time is not None:

            remaining_seconds = max(
                0,
                int(timer_end_time - time.time() + 0.999)
            )

        else:

            remaining_seconds = 0

    status = queue_manager.get_status()

    status["remaining_seconds"] = remaining_seconds

    return jsonify(status)


def announce_current_register():

    current_register = queue_manager.current_register

    if current_register is None:
        return

    announcement_service.announce_register(
        current_register
    )


def start_call_timer():

    global call_id
    global timer_end_time

    with timer_lock:

        call_id += 1

        current_call_id = call_id

        current_register = queue_manager.current_register

        if current_register is None:

            timer_end_time = None

            return

        timer_end_time = (
            time.time()
            + queue_manager.call_duration
        )

    # Announce the register
    announce_current_register()

    timer = threading.Thread(
        target=complete_after_delay,
        args=(current_call_id,),
        daemon=True
    )

    timer.start()


def complete_after_delay(current_call_id):

    global call_id
    global timer_end_time

    time.sleep(
        queue_manager.call_duration
    )

    with timer_lock:

        # Ignore an old timer
        if current_call_id != call_id:
            return

        timer_end_time = None

        queue_manager.complete_current()

        # If another register is waiting,
        # start its timer and announcement
        if queue_manager.current_register is not None:

            call_id += 1

            next_call_id = call_id

            timer_end_time = (
                time.time()
                + queue_manager.call_duration
            )

            next_register = (
                queue_manager.current_register
            )

            # Announce next register
            announcement_service.announce_register(
                next_register
            )

            timer = threading.Thread(
                target=complete_after_delay,
                args=(next_call_id,),
                daemon=True
            )

            timer.start()


@app.route(
    "/api/register/<int:register>/call",
    methods=["POST"]
)
def call_register(register):

    try:

        added = queue_manager.request_register(
            register
        )

        status = queue_manager.get_status()

        # Only announce if this register
        # became the current register
        if (
            added
            and status["current_register"] == register
        ):

            start_call_timer()

        return jsonify({
            "success": True,
            "added": added,
            "status": queue_manager.get_status()
        })

    except ValueError as error:

        return jsonify({
            "success": False,
            "error": str(error)
        }), 400


@app.route(
    "/api/complete",
    methods=["POST"]
)
def complete_current():

    global call_id
    global timer_end_time

    with timer_lock:

        call_id += 1

        timer_end_time = None

    announcement_service.stop_current_announcement()
    result = queue_manager.complete_current()

    if result is None:

        return jsonify({
            "success": False,
            "message":
                "No register is currently being called."
        }), 400

    if result["next"] is not None:

        start_call_timer()

    return jsonify({
        "success": True,
        "result": result,
        "status": queue_manager.get_status()
    })


@app.route(
    "/api/clear",
    methods=["POST"]
)
def clear_queue():

    global call_id
    global timer_end_time

    with timer_lock:

        call_id += 1

        timer_end_time = None

    queue_manager.clear()

    return jsonify({
        "success": True,
        "status": queue_manager.get_status()
    })


# admin
@app.route("/admin", methods=["GET", "POST"])
def admin_login():

    if session.get("admin_logged_in"):

        return render_template("admin.html")


    if request.method == "POST":

        password = request.form.get(
            "password",
            ""
        )

        if password == ADMIN_PASSWORD:

            session["admin_logged_in"] = True

            return redirect(
                url_for("admin_dashboard")
            )

        return render_template(
            "admin_login.html",
            error="Invalid password."
        )


    return render_template(
        "admin_login.html"
    )


@app.route("/admin/dashboard")
@admin_required
def admin_dashboard():

    return render_template(
        "admin.html"
    )


@app.route("/admin/logout")
def admin_logout():

    session.pop(
        "admin_logged_in",
        None
    )

    return redirect(
        url_for("admin_login")
    )


# Router for adding logo
@app.route("/api/admin/logo", methods=["POST"])
@admin_required
def upload_logo():

    if "logo" not in request.files:

        return jsonify({
            "success": False,
            "error": "No logo file provided."
        }), 400

    file = request.files["logo"]

    if file.filename == "":

        return jsonify({
            "success": False,
            "error": "No logo file selected."
        }), 400

    filename = secure_filename(
        file.filename
    )

    extension = filename.rsplit(
        ".",
        1
    )[-1].lower()

    if extension not in ALLOWED_LOGO_EXTENSIONS:

        return jsonify({
            "success": False,
            "error": "Only PNG, JPG and JPEG files are allowed."
        }), 400

    logo_filename = (
        "store_logo."
        + extension
    )

    logo_path = os.path.join(
        LOGO_FOLDER,
        logo_filename
    )

    # Remove previous logo files
    for existing_file in os.listdir(
        LOGO_FOLDER
    ):

        existing_path = os.path.join(
            LOGO_FOLDER,
            existing_file
        )

        if os.path.isfile(existing_path):

            os.remove(existing_path)

    file.save(
        logo_path
    )

    config = config_manager.get()

    config["logo"] = logo_filename

    config_manager.save(
        config
    )

    return jsonify({
        "success": True,
        "logo": logo_filename
    })

@app.route("/api/admin/logo/remove", methods=["POST"])
@admin_required
def remove_logo():
    config = config_manager.get()
    logo_filename = config.get("logo")

    if logo_filename:
        logo_path = os.path.join(LOGO_FOLDER, logo_filename)

        if os.path.exists(logo_path):
            os.remove(logo_path)

    config["logo"] = None
    config_manager.save(config)

    return jsonify({
        "success": True,
        "message": "Logo removed successfully."
    })

@app.route("/store-logo/<path:filename>")
def store_logo(filename):

    return send_from_directory(
        LOGO_FOLDER,
        filename
    )


# Route for Uplaoded Audio
@app.route("/api/admin/audio/<int:register>", methods=["POST"])
@admin_required
def upload_register_audio(register):
    # Validate register number
    if register < 1 or register > 8:
        return jsonify({
            "success": False,
            "error": "Register must be between 1 and 8."
        }), 400

    # Check file
    if "audio" not in request.files:
        return jsonify({
            "success": False,
            "error": "No audio file provided."
        }), 400

    file = request.files["audio"]

    if file.filename == "":
        return jsonify({
            "success": False,
            "error": "No audio file selected."
        }), 400

    # Validate extension
    filename = secure_filename(file.filename)
    extension = filename.rsplit(".", 1)[-1].lower()

    if extension not in ALLOWED_AUDIO_EXTENSIONS:
        return jsonify({
            "success": False,
            "error": "Only MP3 files are allowed."
        }), 400

    # Always use our own filename
    audio_filename = f"register{register}.mp3"
    audio_path = os.path.join(
        AUDIO_FOLDER,
        audio_filename
    )

    # Save audio
    file.save(audio_path)

    # Update configuration
    config = config_manager.get()

    if "registers" not in config:
        config["registers"] = {}

    if str(register) not in config["registers"]:
        config["registers"][str(register)] = {
            "name": f"REGISTER {register}",
            "audio": None
        }

    config["registers"][str(register)]["audio"] = audio_filename

    config_manager.save(config)

    return jsonify({
        "success": True,
        "message": f"Audio uploaded for Register {register}.",
        "audio": audio_filename
    })

@app.route("/api/admin/audio/<int:register>/remove", methods=["POST"])
@admin_required
def remove_register_audio(register):
    if register < 1 or register > 8:
        return jsonify({
            "success": False,
            "error": "Register must be between 1 and 8."
        }), 400

    config = config_manager.get()
    register_config = config.get("registers", {}).get(str(register), {})

    audio_filename = register_config.get("audio")

    if audio_filename:
        audio_path = os.path.join(
            AUDIO_FOLDER,
            audio_filename
        )

        if os.path.exists(audio_path):
            os.remove(audio_path)

    register_config["audio"] = None

    config["registers"][str(register)] = register_config

    config_manager.save(config)

    return jsonify({
        "success": True,
        "message": f"Audio removed for Register {register}."
    })

@app.route("/register-audio/<path:filename>")
@admin_required
def register_audio(filename):
    return send_from_directory(
        AUDIO_FOLDER,
        filename
)
if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5001,
        debug=True,
        threaded=True
    )