/* =========================================================
   GLOBAL STATE
   ========================================================= */

let previousCurrent = null;

let previousQueue = [];

let configuration = null;

let advertisementInitialized = false;


/* =========================================================
   DIGITAL SIGNAGE
   ========================================================= */

let adTimer = null;

let adSlideTimer = null;

let currentAdIndex = 0;

let adsVisible = false;


/* =========================================================
   CONFIGURATION
   ========================================================= */

async function getConfiguration() {

    try {

        const response =
            await fetch("/api/config");


        if (!response.ok) {

            throw new Error(
                "Unable to load configuration"
            );

        }


        configuration =
            await response.json();


        updateConfiguration();


        if (!advertisementInitialized) {

            advertisementInitialized = true;

            resetAdvertisementTimer();

        }

    }
    catch (error) {

        console.error(
            "Unable to get configuration:",
            error
        );

    }

}


/* =========================================================
   HELPER
   ========================================================= */

function setText(
    elementId,
    value
) {

    const element =
        document.getElementById(
            elementId
        );


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   LOGO
   ========================================================= */

function updateLogos() {

    if (!configuration) {
        return;
    }


    const logo =
        configuration.logo;


    const logoElements = [

        document.getElementById(
            "store-logo-idle"
        ),

        document.getElementById(
            "store-logo-call"
        ),

        document.getElementById(
            "store-logo-queue"
        )

    ];


    logoElements.forEach(
        (element) => {

            if (!element) {
                return;
            }


            if (logo) {

                element.src =
                    `/store-logo/${logo}?t=${Date.now()}`;

                element.style.display =
                    "block";

            }
            else {

                element.src = "";

                element.style.display =
                    "none";

            }

        }
    );

}


/* =========================================================
   UPDATE CONFIGURATION
   ========================================================= */

function updateConfiguration() {

    if (!configuration) {
        return;
    }


    const storeName =
        configuration.store_name ||
        "MiRen Next";


    const messages =
        configuration.messages ||
        {};


    updateLogos();

    updateDisplayTheme();


    setText(
        "store-name-idle",
        storeName
    );


    setText(
        "store-name-call",
        storeName
    );


    setText(
        "store-name-queue",
        storeName
    );


    setText(
        "welcome-message",
        messages.welcome ||
        `WELCOME TO ${storeName}`
    );


    setText(
        "idle-next-cashier",
        messages.next_cashier ||
        "NEXT CASHIER"
    );


    setText(
        "call-next-cashier",
        messages.next_cashier ||
        "NEXT CASHIER"
    );


    setText(
        "proceed-message",
        messages.proceed ||
        "PLEASE PROCEED TO"
    );


    /*
       IMPORTANT:
       Queue screen uses Admin's proceed message.
    */

    setText(
        "queue-proceed-message",
        messages.proceed ||
        "PLEASE PROCEED TO"
    );


    setText(
        "now-calling",
        messages.now_calling ||
        "NOW CALLING"
    );


    setText(
        "queue-message",
        messages.ready ||
        "PLEASE PROCEED WHEN READY"
    );


    setText(
        "idle-thank-you",
        messages.thank_you ||
        "THANK YOU"
    );


    setText(
        "call-thank-you",
        messages.thank_you ||
        "THANK YOU"
    );


    /*
       If logo exists, don't show store name.
    */

    const storeNames = [

        document.getElementById(
            "store-name-idle"
        ),

        document.getElementById(
            "store-name-call"
        ),

        document.getElementById(
            "store-name-queue"
        )

    ];


    storeNames.forEach(
        (element) => {

            if (!element) {
                return;
            }


            element.style.display =
                configuration.logo
                    ? "none"
                    : "block";

        }
    );


    /*
       Refresh current register
       using latest admin settings.
    */

    if (previousCurrent !== null) {

        updateCurrentRegister(
            previousCurrent
        );

    }

}


/* =========================================================
   THEME
   ========================================================= */

function updateDisplayTheme() {

    if (!configuration) {
        return;
    }


    document.body.setAttribute(
        "data-theme",
        configuration.display_theme ||
        "light"
    );

}


/* =========================================================
   REGISTER NAME
   ========================================================= */

function getRegisterName(
    register
) {

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


/* =========================================================
   UPDATE CURRENT REGISTER
   ========================================================= */

function updateCurrentRegister(
    register
) {

    if (
        register === null ||
        register === undefined
    ) {

        return;

    }


    const registerName =
        getRegisterName(
            register
        );


    setText(
        "register-name",
        registerName
    );


    setText(
        "queue-current-name",
        registerName
    );

}


/* =========================================================
   STATUS
   ========================================================= */

async function getStatus() {

    try {

        const response =
            await fetch(
                "/api/status"
            );


        if (!response.ok) {

            throw new Error(
                "Unable to get status"
            );

        }


        const data =
            await response.json();


        updateDisplay(data);

    }
    catch (error) {

        console.error(
            "Unable to get cashier status:",
            error
        );

    }

}


/* =========================================================
   UPDATE DISPLAY
   ========================================================= */

function updateDisplay(data) {

    const current =
        data.current_register;


    const queue =
        Array.isArray(data.queue)
            ? data.queue
            : [];


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
    =========================================================
    ACTIVE REGISTER
    =========================================================
    */

    if (current !== null) {

        hideAdvertisements();

        document.body.classList.add(
            "call-active"
        );

    }
    else {

        document.body.classList.remove(
            "call-active"
        );

    }


    /*
    =========================================================
    IDLE
    =========================================================
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


        if (
            previousCurrent !== null
        ) {

            resetAdvertisementTimer();

        }


        previousCurrent =
            null;


        previousQueue =
            [];


        return;

    }


    /*
    =========================================================
    QUEUE MODE
    =========================================================
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


        /*
        -----------------------------------------------------
        Current register
        -----------------------------------------------------
        */

        const currentChanged =
            previousCurrent !== current;


        updateCurrentRegister(
            current
        );


        /*
        -----------------------------------------------------
        Admin proceed message
        -----------------------------------------------------
        */

        const messages =
            configuration &&
            configuration.messages
                ? configuration.messages
                : {};


        setText(
            "queue-proceed-message",
            messages.proceed ||
            "PLEASE PROCEED TO"
        );


        /*
        -----------------------------------------------------
        Ready message
        -----------------------------------------------------
        */

        setText(
            "queue-message",
            messages.ready ||
            "PLEASE PROCEED WHEN READY"
        );


        /*
        -----------------------------------------------------
        Timer ONLY updates timer
        -----------------------------------------------------
        */

        setText(
            "queue-timer",
            remainingSeconds
        );


        /*
        -----------------------------------------------------
        Queue changed?
        -----------------------------------------------------
        */

        const queueChanged =
            JSON.stringify(previousQueue) !==
            JSON.stringify(queue);


        /*
        -----------------------------------------------------
        ONLY rebuild queue list if queue changed.
        This fixes blinking.
        -----------------------------------------------------
        */

        if (queueChanged) {

            setText(
                "queue-count",
                queue.length
            );


            updateQueueList(
                queue
            );

        }


        /*
        -----------------------------------------------------
        Animate current register only when
        current register actually changes.
        -----------------------------------------------------
        */

        if (currentChanged) {

            restartAnimation(
                "queue-current",
                "queue-refresh"
            );

        }


        previousCurrent =
            current;


        previousQueue =
            [...queue];


        return;

    }


    /*
    =========================================================
    SINGLE REGISTER MODE
    =========================================================
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


    const currentChanged =
        previousCurrent !== current;


    /*
    ---------------------------------------------------------
    Register name
    ---------------------------------------------------------
    */

    updateCurrentRegister(
        current
    );


    /*
    ---------------------------------------------------------
    Proceed message
    ---------------------------------------------------------
    */

    const messages =
        configuration &&
        configuration.messages
            ? configuration.messages
            : {};


    setText(
        "proceed-message",
        messages.proceed ||
        "PLEASE PROCEED TO"
    );


    /*
    ---------------------------------------------------------
    Timer
    ---------------------------------------------------------
    */

    setText(
        "timer",
        remainingSeconds
    );


    /*
    ---------------------------------------------------------
    Animate only when new register appears
    ---------------------------------------------------------
    */

    if (currentChanged) {

        restartAnimation(
            "register-box",
            "register-pop"
        );

    }


    previousCurrent =
        current;


    previousQueue =
        [...queue];

}


/* =========================================================
   UPDATE QUEUE LIST
   ========================================================= */

function updateQueueList(
    queue
) {

    const list =
        document.getElementById(
            "queue-list"
        );


    if (!list) {
        return;
    }


    /*
       Clear only when the actual queue changes.
    */

    list.innerHTML = "";


    queue.forEach(
        (
            register,
            index
        ) => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "queue-item";


            const number =
                document.createElement(
                    "div"
                );


            number.className =
                "queue-item-number";


            number.textContent =
                register;


            const name =
                document.createElement(
                    "div"
                );


            name.className =
                "queue-item-name";


            name.textContent =
                getRegisterName(
                    register
                );


            item.appendChild(
                number
            );


            item.appendChild(
                name
            );


            /*
               IMPORTANT:
               No animation delay here.

               This prevents the queue items from
               looking like they blink every second.
            */


            list.appendChild(
                item
            );

        }
    );

}


/* =========================================================
   RESTART ANIMATION
   ========================================================= */

function restartAnimation(
    elementId,
    animationClass
) {

    const element =
        document.getElementById(
            elementId
        );


    if (!element) {
        return;
    }


    element.classList.remove(
        animationClass
    );


    void element.offsetWidth;


    element.classList.add(
        animationClass
    );

}


/* =========================================================
   DIGITAL SIGNAGE
   ========================================================= */

function getDigitalSignageConfig() {

    if (!configuration) {
        return null;
    }


    return (
        configuration.digital_signage ||
        null
    );

}


function getAdScreen() {

    return document.getElementById(
        "ad-screen"
    );

}


/* =========================================================
   HIDE ADS
   ========================================================= */

function hideAdvertisements() {

    const screen =
        getAdScreen();


    if (screen) {

        screen.classList.add(
            "hidden"
        );

    }


    adsVisible = false;


    if (adTimer) {

        clearTimeout(
            adTimer
        );

        adTimer = null;

    }


    if (adSlideTimer) {

        clearInterval(
            adSlideTimer
        );

        adSlideTimer = null;

    }

}


/* =========================================================
   RESET AD TIMER
   ========================================================= */

function resetAdvertisementTimer() {

    hideAdvertisements();


    currentAdIndex = 0;


    const signage =
        getDigitalSignageConfig();


    if (
        !signage ||
        signage.enabled === false ||
        !Array.isArray(signage.ads) ||
        signage.ads.length === 0
    ) {

        return;

    }


    const delay =
        Math.max(
            0,
            Number(
                signage.start_delay ?? 60
            )
        );


    adTimer =
        setTimeout(
            showAdvertisements,
            delay * 1000
        );

}


/* =========================================================
   SHOW ADS
   ========================================================= */

function showAdvertisements() {

    const signage =
        getDigitalSignageConfig();


    if (
        !signage ||
        signage.enabled === false ||
        !Array.isArray(signage.ads) ||
        signage.ads.length === 0
    ) {

        return;

    }


    if (
        previousCurrent !== null
    ) {

        return;

    }


    const screen =
        getAdScreen();


    if (!screen) {
        return;
    }


    adsVisible = true;

    currentAdIndex = 0;


    const currentImage =
        document.getElementById(
            "ad-image-current"
        );


    const nextImage =
        document.getElementById(
            "ad-image-next"
        );


    if (currentImage) {

        currentImage.src =
            `/ads/${signage.ads[0]}?t=${Date.now()}`;

    }


    if (
        nextImage &&
        signage.ads.length > 1
    ) {

        nextImage.src =
            `/ads/${signage.ads[1]}?t=${Date.now()}`;

    }


    screen.classList.remove(
        "hidden"
    );


    buildAdProgress();


    const interval =
        Math.max(
            1,
            Number(
                signage.slide_interval ?? 20
            )
        );


    if (
        signage.ads.length > 1
    ) {

        adSlideTimer =
            setInterval(
                showNextAdvertisement,
                interval * 1000
            );

    }

}


/* =========================================================
   AD PROGRESS
   ========================================================= */

function buildAdProgress() {

    const progress =
        document.getElementById(
            "ad-progress"
        );


    const signage =
        getDigitalSignageConfig();


    if (
        !progress ||
        !signage ||
        !Array.isArray(signage.ads)
    ) {

        return;

    }


    progress.innerHTML = "";


    signage.ads.forEach(
        (_, index) => {

            const dot =
                document.createElement(
                    "div"
                );


            dot.className =
                "ad-dot";


            if (
                index === currentAdIndex
            ) {

                dot.classList.add(
                    "active"
                );

            }


            progress.appendChild(
                dot
            );

        }
    );

}


function updateAdProgress() {

    const dots =
        document.querySelectorAll(
            ".ad-dot"
        );


    dots.forEach(
        (dot, index) => {

            dot.classList.toggle(
                "active",
                index === currentAdIndex
            );

        }
    );

}


/* =========================================================
   NEXT AD
   ========================================================= */

function showNextAdvertisement() {

    if (!adsVisible) {
        return;
    }


    const signage =
        getDigitalSignageConfig();


    if (
        !signage ||
        !Array.isArray(signage.ads) ||
        signage.ads.length < 2
    ) {

        return;

    }


    const currentImage =
        document.getElementById(
            "ad-image-current"
        );


    const nextImage =
        document.getElementById(
            "ad-image-next"
        );


    if (
        !currentImage ||
        !nextImage
    ) {

        return;

    }


    const nextIndex =
        (
            currentAdIndex + 1
        ) %
        signage.ads.length;


    nextImage.src =
        `/ads/${signage.ads[nextIndex]}?t=${Date.now()}`;


    nextImage.style.transform =
        "translateX(100%)";


    requestAnimationFrame(
        () => {

            currentImage.style.transform =
                "translateX(-100%)";


            nextImage.style.transform =
                "translateX(0)";

        }
    );


    setTimeout(
        () => {

            currentImage.src =
                nextImage.src;


            currentImage.style.transition =
                "none";


            currentImage.style.transform =
                "translateX(0)";


            nextImage.style.transition =
                "none";


            nextImage.style.transform =
                "translateX(100%)";


            requestAnimationFrame(
                () => {

                    currentImage.style.transition =
                        "";

                    nextImage.style.transition =
                        "";

                }
            );


            currentAdIndex =
                nextIndex;


            updateAdProgress();

        },
        950
    );

}


/* =========================================================
   INITIALIZE
   ========================================================= */

getConfiguration();

getStatus();


/* =========================================================
   STATUS EVERY SECOND
   ========================================================= */

setInterval(
    getStatus,
    1000
);


/* =========================================================
   CONFIG EVERY 3 SECONDS
   ========================================================= */

setInterval(
    getConfiguration,
    3000
);