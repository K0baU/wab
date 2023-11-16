export const doc = {
    sendForm: document.getElementById('sendForm'),
    messageInputBox: document.getElementById('message'),
    uploadFile: document.getElementById('file'),
    uploadBtn: document.getElementById('upload'),
    contents: document.getElementById('receivebox'),
    idElm: document.getElementById('id'),
    idSmr: document.getElementById('idSmr'),
    logElm: document.getElementById('log'),
    amountIn: document.getElementById('amount'),
    credits: document.getElementById('credits'),
};

export const addDOM = (par, children, add = "append") => {
    for (const child of children) {
        if (child.tag) {
            const elm = document.createElement(child.tag);
            elm.append(child.content);
            par[add](elm);
        } else {
            par[add](child);
        }
    }
};