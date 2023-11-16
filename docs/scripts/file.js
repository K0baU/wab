import { log } from "./esm/log.js";
import { doc } from "./esm/doc.js";
import { addContent } from "./esm/add-content.js";

const handleFiles = () => {
            log("upload file");
            for (const file of doc.uploadFile.files) {
                addContent("content", file);
            }
        };

        doc.uploadFile.onchange = handleFiles;
        doc.uploadBtn.onclick = () => doc.uploadFile.click();
        const stop = (e) => {
            e.stopPropagation();
            e.preventDefault();
        };
        doc.sendForm.ondragenter = stop;
        doc.sendForm.ondragover = stop;
        doc.sendForm.ondrop = (e) => {
            stop(e);
            doc.uploadFile.files = e.dataTransfer.files;
            handleFiles();
        };