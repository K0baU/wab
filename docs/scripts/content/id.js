export const cid = async rec =>
    (new Uint8Array(await crypto.subtle.digest("SHA-256",
        rec.type ? await rec.arrayBuffer() : rec))).toString();
const chars = "234679abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZあいうえおかきくけこさしすせそたちつてとなにぬねのはひふほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだぢづでどばびぶぼぱぴぷぽアイウオキクケコサシスセソチツテトナヌネノハヒフホマムメモヤユヨラリルレワヲンガギグゲゴザジズゼゾダヂヅデドバビブボパピプポ右雨円王音下火花貝学気九休玉金空月犬見五校左山子四糸字耳七車手十出女小上森人水正生青石赤千川先早草足村大男竹中虫町天田土日入年白八百文木本名目立林六";
export const encodeId = (str) => {
    const arr = str.split(",");
    let rtn = "";
    for (const n of arr) {
        rtn += chars[n];
    }
    return rtn;
};
export const decodeId = (str) => {
    const arr = [];
    for (let i = 0; i < str.length; i++) {
        arr.push(chars.indexOf(str[i]));
    }
    return arr.toString();
};