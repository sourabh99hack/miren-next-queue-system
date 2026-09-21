let previousCurrent = null;

let configuration = null;


/*
========================================
GET CONFIGURATION
========================================
*/

async function getConfiguration() {

    try {

        const response = await fetch(
            "/api/config"
        );

        if (!response.ok) {

            throw new Error(
                "Unable to load configuration"
            );

        }

        configuration =
            await response.json();

        updateConfiguration();

    } catch (error) {

        console.error(
            "Unable to get configuration:",
            error
        );

    }

}


/*
========================================
UPDATE DISPLAY CONFIGURATION
========================================
*/

function updateLogos() {
    if (!configuration) {
        return;
    }

    const logo = configuration.logo;

    const logoElements = [
        document.getElementById("store-logo-idle"),
        document.getElementById("store-logo-call"),
        document.getElementById("store-logo-queue")
    ];

    const storeNameElements = [
        document.getElementById("store-name-idle"),
        document.getElementById("store-name-call"),
        document.getElementById("store-name-queue")
    ];

    logoElements.forEach((element) => {
        if (!element) {
            return;
        }

        if (logo) {
            element.src = `/store-logo/${logo}?t=${Date.now()}`;
            element.style.display = "block";
        } else {
            element.src = "";
            element.style.display = "none";
        }
    });

    storeNameElements.forEach((element) => {
        if (!element) {
            return;
        }

        if (logo) {
            element.style.display = "none";
        } else {
            element.style.display = "block";
        }
    });
}

function updateConfiguration() {

    if (!configuration) {
        return;
    }


    const storeName = configuration.store_name || "MiRen Next";

    updateLogos();
    updateDisplayTheme();


    const messages =
        configuration.messages || {};


    const registers =
        configuration.registers || {};


    /*
    ------------------------------------
    Store Name
    ------------------------------------
    */

    document.getElementById(
        "store-name-idle"
    ).textContent = storeName;


    document.getElementById(
        "store-name-call"
    ).textContent = storeName;


    document.getElementById(
        "store-name-queue"
    ).textContent = storeName;


    /*
    ------------------------------------
    Messages
    ------------------------------------
    */

    document.getElementById(
        "welcome-message"
    ).textContent =
        messages.welcome ||
        `WELCOME TO ${storeName}`;


    document.getElementById(
        "idle-next-cashier"
    ).textContent =
        messages.next_cashier ||
        "NEXT CASHIER";


    document.getElementById(
        "call-next-cashier"
    ).textContent =
        messages.next_cashier ||
        "NEXT CASHIER";


    document.getElementById(
        "proceed-message"
    ).textContent =
        messages.proceed ||
        "PLEASE PROCEED TO";


    document.getElementById(
        "now-calling"
    ).textContent =
        messages.now_calling ||
        "NOW CALLING";


    document.getElementById(
        "queue-message"
    ).textContent =
        messages.ready ||
        "PLEASE PROCEED WHEN READY";

    const waitMessage =
        document.querySelector(".wait-message");

    if (waitMessage) {

        waitMessage.textContent =
            messages.wait ||
            "PLEASE WAIT FOR THE NEXT AVAILABLE REGISTER";

    }


    document.getElementById(
        "idle-thank-you"
    ).textContent =
        messages.thank_you ||
        "THANK YOU";


    document.getElementById(
        "call-thank-you"
    ).textContent =
        messages.thank_you ||
        "THANK YOU";


    /*
    ------------------------------------
    Refresh current register name
    ------------------------------------
    */

    updateCurrentRegisterName();

}

function updateDisplayTheme() {
    if (!configuration) {
        return;
    }

    const theme = configuration.display_theme || "light";

    document.body.setAttribute("data-theme", theme);
}

/*
========================================
GET REGISTER NAME
========================================
*/

function getRegisterName(register) {

    if (
        !configuration ||
        !configuration.registers
    ) {

        return `REGISTER ${register}`;

    }


    const registerConfig =
        configuration.registers[
        String(register)
        ];


    if (
        registerConfig &&
        registerConfig.name
    ) {

        return registerConfig.name;

    }


    return `REGISTER ${register}`;

}


/*
========================================
UPDATE CURRENT REGISTER NAME
========================================
*/

function updateCurrentRegisterName() {

    if (previousCurrent === null) {
        return;
    }


    const registerName =
        getRegisterName(
            previousCurrent
        );


    const registerBox =
        document.getElementById(
            "register-box"
        );


    const queueCurrent =
        document.getElementById(
            "queue-current"
        );


    if (registerBox) {

        registerBox.textContent =
            `${registerName} →`;

    }


    if (queueCurrent) {

        queueCurrent.textContent =
            registerName;

    }

}


/*
========================================
GET STATUS
========================================
*/

async function getStatus() {

    try {

        const response = await fetch(
            "/api/status"
        );

        const data =
            await response.json();

        updateDisplay(data);

    } catch (error) {

        console.error(
            "Unable to get cashier status:",
            error
        );

    }

}


/*
========================================
UPDATE DISPLAY
========================================
*/

function updateDisplay(data) {

    const current =
        data.current_register;

    const queue =
        data.queue || [];

    const remainingSeconds =
        data.remaining_seconds || 0;


    const idleScreen =
        document.getElementById(
            "idle-screen"
        );

    const callScreen =
        document.getElementById(
            "call-screen"
        );

    const queueScreen =
        document.getElementById(
            "queue-screen"
        );


    /*
    ------------------------------------
    No Current Register
    ------------------------------------
    */

    if (current === null) {

        idleScreen.classList.remove(
            "hidden"
        );

        callScreen.classList.add(
            "hidden"
        );

        queueScreen.classList.add(
            "hidden"
        );

        previousCurrent = null;

        return;

    }


    /*
    ------------------------------------
    Queue Mode
    ------------------------------------
    */

    if (queue.length > 0) {

        idleScreen.classList.add(
            "hidden"
        );

        callScreen.classList.add(
            "hidden"
        );

        queueScreen.classList.remove(
            "hidden"
        );


        const currentRegisterName =
            getRegisterName(current);


        document.getElementById(
            "queue-current"
        ).textContent =
            currentRegisterName;


        const nextRegisterName =
            getRegisterName(
                queue[0]
            );


        const nextMessage =
            configuration &&
                configuration.messages &&
                configuration.messages.next
                ? configuration.messages.next
                : "NEXT";


        document.getElementById(
            "next-register"
        ).textContent =
            `${nextMessage}: ${nextRegisterName}`;


        document.getElementById(
            "queue-timer"
        ).textContent =
            remainingSeconds;


        previousCurrent = current;

        return;

    }


    /*
    ------------------------------------
    Normal Call Mode
    ------------------------------------
    */

    idleScreen.classList.add(
        "hidden"
    );

    queueScreen.classList.add(
        "hidden"
    );

    callScreen.classList.remove(
        "hidden"
    );


    const registerName =
        getRegisterName(current);


    document.getElementById(
        "register-box"
    ).textContent =
        `${registerName} →`;


    document.getElementById(
        "timer"
    ).textContent =
        remainingSeconds;


    previousCurrent = current;

}


/*
========================================
INITIAL LOAD
========================================
*/

getConfiguration();

getStatus();


/*
========================================
REFRESH STATUS
========================================
*/

setInterval(
    getStatus,
    1000
);


/*
========================================
REFRESH CONFIGURATION
========================================

Check every 3 seconds so that if the
admin changes the settings, the TV
display updates automatically.
========================================
*/

setInterval(
    getConfiguration,
    3000
);