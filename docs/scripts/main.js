import { doc } from "./esm/doc.js";
import { display } from "./esm/display.js";
import { opr } from "./esm/db.js";

window.onerror = log;

    display();
    opr.for({ store: "credits", f: value => {
        if (value.name == "" && value.credit == 0) {
            opr.crud({store:"credits",op:"delete"});
        }
    }, end: () => opr.for({ store: "credits", f: displayPeer }) });
    doc.messageInputBox.oninput = display;