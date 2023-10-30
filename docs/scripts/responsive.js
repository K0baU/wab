const doc = {
    left: document.getElementById('left'),
    center: document.getElementById('center'),
    right: document.getElementById('right'),
}
const hide = () => {
    doc.left.style.display = "none";
    doc.center.style.display = "none";
    doc.right.style.display = "none";
};
document.getElementById("showLeft").onclick = () => {
    hide();
    doc.left.style.display = "flex";
}
document.getElementById("showCenter").onclick = () => {
    hide();
    doc.center.style.display = "flex";
}
document.getElementById("showRight").onclick = () => {
    hide();
    doc.right.style.display = "block";
}
