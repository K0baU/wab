import { doc } from "../../lib/doc.js";
import { addContent } from "../add.js";

const fileInput = doc("fileInput");

const handleFiles = () => {
    for (const file of fileInput.files) {
        addContent("content", file);
    }
};

fileInput.onchange = handleFiles;
doc("uploadBtn").onclick = () => fileInput.click();
const stop = (e) => {
    e.stopPropagation();
    e.preventDefault();
};
const sendForm = doc("sendForm");
sendForm.ondragenter = stop;
sendForm.ondragover = stop;
sendForm.ondrop = e => {
    stop(e);
    fileInput.files = e.dataTransfer.files;
    handleFiles();
};