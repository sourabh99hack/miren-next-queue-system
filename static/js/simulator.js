async function callRegister(register) {

    try {

        const response = await fetch(
            `/api/register/${register}/call`,
            {
                method: "POST"
            }
        );

        const data = await response.json();

        console.log(data);

        updateStatus();

    } catch (error) {

        console.error(
            "Unable to call register:",
            error
        );

    }
}


async function completeCurrent() {

    try {

        const response = await fetch(
            "/api/complete",
            {
                method: "POST"
            }
        );

        const data = await response.json();

        console.log(data);

        updateStatus();

    } catch (error) {

        console.error(error);

    }
}


async function clearQueue() {

    try {

        const response = await fetch(
            "/api/clear",
            {
                method: "POST"
            }
        );

        const data = await response.json();

        console.log(data);

        updateStatus();

    } catch (error) {

        console.error(error);

    }
}


async function updateStatus() {

    try {

        const response =
            await fetch("/api/status");

        const data =
            await response.json();


        const current =
            data.current_register;


        const queue =
            data.queue;


        document.getElementById("status").innerHTML = `

            <strong>
                Current:
            </strong>

            ${current === null ? "None" : "Register " + current}

            <br><br>

            <strong>
                Queue:
            </strong>

            ${queue.length === 0
                ? "Empty"
                : queue.map(
                    register =>
                    `Register ${register}`
                  ).join(" → ")
            }

        `;

    } catch (error) {

        console.error(error);

    }
}


// Register buttons
document
    .querySelectorAll(".register-buttons button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const register =
                    Number(button.dataset.register);

                callRegister(register);

            }
        );

    });


// Complete button
document
    .getElementById("complete-button")
    .addEventListener(
        "click",
        completeCurrent
    );


// Clear button
document
    .getElementById("clear-button")
    .addEventListener(
        "click",
        clearQueue
    );


// Keyboard shortcuts
document.addEventListener(
    "keydown",
    event => {

        if (
            event.key >= "1" &&
            event.key <= "4"
        ) {

            const register =
                Number(event.key);

            callRegister(register);

        }

    }
);


// Initial status
updateStatus();