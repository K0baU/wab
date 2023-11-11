import { doc, addDOM } from "/esm/doc.js";
import { opr } from "/esm/db.js";

export const displayPeer = (record) => {
        const radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "target";
        radio.id = record.id;
        radio.value = record.id;
        const peerLbl = document.createElement("label");
        addDOM(doc.credits, [radio, peerLbl]);
        peerLbl.htmlFor = record.id;
        const peerIdElm = document.createElement("details");
        addDOM(peerIdElm, [{ tag: "summary", content: record.id.slice(0, 4) + "..." }, record.id]);
        const online = document.createElement("output");
        if (conns[record.id]) {
            online.append(onlineMsg);
        }
        onlines[record.id] = online;
        const renameForm = document.createElement("form");
        const renameInput = document.createElement("input");
        addDOM(renameForm, [renameInput, { tag: "button", content: "✍" }])
        renameInput.value = record.name == "" ? "名無しさん" : record.name;
        renameForm.onsubmit = (e) => {
            e.preventDefault();
            log(`rename: ${record.name} => ${renameInput.value}`);
            opr.crud("credits", "get", record.id, (rec) => {
                rec.name = renameInput.value;
                opr.crud("credits", "put", rec);
            });
        };
        const creditOut = document.createElement("output");
        creditOuts[record.id] = creditOut;
        creditOut.value = record.credit;
        addDOM(peerLbl, [peerIdElm, online, renameForm, creditOut]);
    }