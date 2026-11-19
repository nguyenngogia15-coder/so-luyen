const fs = require("fs"), path = require("path"), D = __dirname;
eval(["listen-data-1.js", "listen-data-2.js", "listen-data-3.js", "listen-path.js"].map(f => fs.readFileSync(path.join(D, f), "utf8")).join("\n").replace(/^const /gm, "var "));
const GV = { female: ["Aoede", "Kore", "Leda", "Sulafat", "Autonoe", "Despina"], male: ["Charon", "Puck", "Achird", "Iapetus", "Sadaltager", "Algieba"] };
const gem = (id, sp) => { const o = {}; Object.entries(sp).forEach(([k, v], i) => { const list = GV[v.g === "female" ? "female" : "male"]; const pick = /lectur|professor|biolog|manager|officer|agent/i.test(v.name + v.mood) ? list[0] : list[(i + id.length) % list.length]; o[k] = { voice: pick, desc: `${v.name}, a ${v.g} speaker with a ${v.acc} accent; tone: ${v.mood}.` }; }); return o; };
fs.writeFileSync(path.join(D, "site", "ls-bank.json"), JSON.stringify([...LS_BANK, ...LP_PATH.map(l => l.pr)].map(s => ({ id: s.id, turns: s.turns, gem: gem(s.id, s.sp) }))));
console.log("ls-bank.json", LS_BANK.length);
/* Câu hỏi Speaking cho máy chủ thu giọng giám khảo Gemini */
eval(["speak-data-sp.js"].map(f => fs.readFileSync(path.join(D, f), "utf8")).join("\n").replace(/^const /gm, "var "));
const rm = fs.readFileSync(path.join(D, "room.js"), "utf8"); eval(rm.slice(rm.indexOf("const SPQ_INTRO2"), rm.indexOf("const SPQ = {}")).replace(/^const /gm, "var "));
fs.writeFileSync(path.join(D, "site", "sp-bank.json"), JSON.stringify(spqGroups()));
console.log("sp-bank.json", spqGroups().length);
