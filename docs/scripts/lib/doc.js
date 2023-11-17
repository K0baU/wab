export const doc = id => document.getElementById(id);

export const addDOM = (par, children, add = "append") => {
    for (const child of children) {
        if (child.tag) {
            const elm = document.createElement(child.tag);
            elm.append(child.content);
            par[add](elm);
        } else par[add](child);
    }
};