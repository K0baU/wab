import { doc, addDOM } from "../lib/doc.js";
import { opr } from "../lib/db.js";

export const showAPeer = rec => {
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "target";
    radio.id = rec.id;
    radio.value = rec.id;
    const peerLbl = document.createElement("label");
    addDOM(doc("peersForm"), [radio, peerLbl]);
    peerLbl.htmlFor = rec.id;
    const peerIdElm = document.createElement("details");
    addDOM(peerIdElm, [{ tag: "summary", content: rec.id.slice(0, 4) + "..." }, rec.id]);
    const online = document.createElement("output");
    if (conns[rec.id]) {
        online.append(onlineMsg);
    }
    onlines[rec.id] = online;
    const renameForm = document.createElement("form");
    const renameInput = document.createElement("input");
    addDOM(renameForm, [renameInput, { tag: "button", content: "✍" }])
    renameInput.value = rec.name == "" ? "名無しさん" : rec.name;
    renameForm.onsubmit = (e) => {
        e.preventDefault();
        log(`rename: ${rec.name} => ${renameInput.value}`);
        opr.crud("peers", "get", rec.id, (rec) => {
            rec.name = renameInput.value;
            opr.crud("peers", "put", rec);
        });
    };
    const creditOut = document.createElement("output");
    creditOuts[rec.id] = creditOut;
    creditOut.value = rec.credit;
    addDOM(peerLbl, [peerIdElm, online, renameForm, creditOut]);
}