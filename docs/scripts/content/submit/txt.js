import { doc } from "../../lib/doc.js";
import { addContent } from "../add.js";

const messageInput = doc("messageInput");

const submitContent = () => {
    addContent("content", new Blob([messageInput.value], { type: "text/plain" }));
    messageInput.value = "";
};
doc("sendForm").onsubmit = e => {
    e.preventDefault();
    submitContent();
};
messageInput.onkeydown = e => {
    if (e.key == "Enter" && e.metaKey) submitContent();
};
