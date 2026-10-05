/* =====================================
   SUPABASE CONFIGURATION
   ===================================== */

const SUPABASE_URL =
    "PASTE_YOUR_SUPABASE_URL_HERE";

const SUPABASE_ANON_KEY =
    "PASTE_YOUR_SUPABASE_PUBLISHABLE_KEY_HERE";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


/* =====================================
   VARIABLES
   ===================================== */

let currentEntryId = null;

let allEntries = [];


/* =====================================
   LOGIN
   ===================================== */

async function login() {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    const message =
        document.getElementById("loginMessage");


    if (!email || !password) {

        message.textContent =
            "Please enter your email and password.";

        return;
    }


    const { data, error } =
        await supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

        });


    if (error) {

        message.textContent =
            "Login failed: " + error.message;

        return;
    }


    showDiary();

    loadEntries();
}


/* =====================================
   LOGOUT
   ===================================== */

async function logout() {

    await supabaseClient.auth.signOut();

    document
        .getElementById("diaryScreen")
        .classList.add("hidden");

    document
        .getElementById("loginScreen")
        .classList.remove("hidden");
}


/* =====================================
   SHOW DIARY
   ===================================== */

function showDiary() {

    document
        .getElementById("loginScreen")
        .classList.add("hidden");

    document
        .getElementById("diaryScreen")
        .classList.remove("hidden");
}


/* =====================================
   LOAD ENTRIES
   ===================================== */

async function loadEntries() {

    const {
        data,
        error
    } = await supabaseClient

        .from("diary_entries")

        .select("*")

        .order(
            "entry_date",
            {
                ascending: false
            }
        );


    if (error) {

        console.error(error);

        return;
    }


    allEntries = data || [];

    displayEntries(allEntries);


    if (allEntries.length > 0) {

        openEntry(allEntries[0]);

    } else {

        newEntry();

    }
}


/* =====================================
   DISPLAY ENTRIES
   ===================================== */

function displayEntries(entries) {

    const list =
        document.getElementById("entryList");


    list.innerHTML = "";


    entries.forEach(entry => {

        const div =
            document.createElement("div");


        div.className = "entry-item";


        div.innerHTML = `

            <strong>
                ${escapeHTML(
                    entry.title || "Untitled Entry"
                )}
            </strong>

            <div class="entry-date">

                ${entry.entry_date}

                ${entry.mood
                    ? " · " + escapeHTML(entry.mood)
                    : ""
                }

            </div>

        `;


        div.onclick = () =>
            openEntry(entry);


        list.appendChild(div);

    });
}


/* =====================================
   NEW ENTRY
   ===================================== */

function newEntry() {

    currentEntryId = null;


    document.getElementById(
        "entryTitle"
    ).value = "";


    document.getElementById(
        "entryDate"
    ).value =
        new Date()
        .toISOString()
        .split("T")[0];


    document.getElementById(
        "mood"
    ).value = "";


    document.getElementById(
        "entryContent"
    ).value = "";


    document.getElementById(
        "saveMessage"
    ).textContent = "";

}


/* =====================================
   OPEN ENTRY
   ===================================== */

function openEntry(entry) {

    currentEntryId = entry.id;


    document.getElementById(
        "entryTitle"
    ).value =
        entry.title || "";


    document.getElementById(
        "entryDate"
    ).value =
        entry.entry_date;


    document.getElementById(
        "mood"
    ).value =
        entry.mood || "";


    document.getElementById(
        "entryContent"
    ).value =
        entry.content || "";


    document.getElementById(
        "saveMessage"
    ).textContent = "";

}


/* =====================================
   SAVE ENTRY
   ===================================== */

async function saveEntry() {

    const {
        data: {
            user
        }
    } =
        await supabaseClient.auth.getUser();


    if (!user) {

        alert("Please log in again.");

        return;
    }


    const title =
        document.getElementById(
            "entryTitle"
        ).value.trim();


    const date =
        document.getElementById(
            "entryDate"
        ).value;


    const mood =
        document.getElementById(
            "mood"
        ).value;


    const content =
        document.getElementById(
            "entryContent"
        ).value;


    if (!date) {

        alert("Please choose a date.");

        return;
    }


    const entryData = {

        user_id: user.id,

        title: title,

        content: content,

        mood: mood,

        entry_date: date,

        updated_at: new Date().toISOString()

    };


    let result;


    if (currentEntryId) {

        result =
            await supabaseClient

                .from("diary_entries")

                .update(entryData)

                .eq(
                    "id",
                    currentEntryId
                );

    } else {

        result =
            await supabaseClient

                .from("diary_entries")

                .insert(entryData);

    }


    if (result.error) {

        console.error(result.error);

        alert(
            "Could not save entry: " +
            result.error.message
        );

        return;
    }


    document.getElementById(
        "saveMessage"
    ).textContent =
        "✓ Saved privately";


    await loadEntries();
}


/* =====================================
   DELETE ENTRY
   ===================================== */

async function deleteEntry() {

    if (!currentEntryId) {

        return;
    }


    const confirmDelete =
        confirm(
            "Delete this diary entry permanently?"
        );


    if (!confirmDelete) {

        return;
    }


    const {
        error
    } =
        await supabaseClient

            .from("diary_entries")

            .delete()

            .eq(
                "id",
                currentEntryId
            );


    if (error) {

        alert(
            "Could not delete entry."
        );

        return;
    }


    currentEntryId = null;

    newEntry();

    await loadEntries();
}


/* =====================================
   SEARCH
   ===================================== */

function searchEntries() {

    const query =
        document.getElementById(
            "search"
        ).value
        .toLowerCase()
        .trim();


    if (!query) {

        displayEntries(allEntries);

        return;
    }


    const filtered =
        allEntries.filter(entry =>

            (entry.title || "")
                .toLowerCase()
                .includes(query)

            ||

            (entry.content || "")
                .toLowerCase()
                .includes(query)

            ||

            (entry.mood || "")
                .toLowerCase()
                .includes(query)

        );


    displayEntries(filtered);
}


/* =====================================
   BASIC HTML ESCAPING
   ===================================== */

function escapeHTML(value) {

    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");
}


/* =====================================
   CHECK EXISTING SESSION
   ===================================== */

async function checkSession() {

    const {
        data: {
            session
        }
    } =
        await supabaseClient
            .auth
            .getSession();


    if (session) {

        showDiary();

        loadEntries();

    }

}


checkSession();
