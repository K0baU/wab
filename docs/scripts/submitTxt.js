import { doc } from "./esm/doc.js";
import { addContent } from "./esm/add-content.js";

const submitContent = async () => {
            const str = doc.messageInputBox.value;
            const content = new Blob([str], { type: "text/plain" });
            addContent("content", content);
            doc.messageInputBox.value = "";
        };
        doc.sendForm.onsubmit = e => {
            e.preventDefault();
            submitContent();
        };
        doc.messageInputBox.onkeydown = (e) => {
            if (e.key == "Enter" && e.metaKey) {
                submitContent();
            }
        }