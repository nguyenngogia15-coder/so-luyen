/* Kiểm tra file .jsonl mục từ. Dùng: node validate.js <file.jsonl> [in.json]  (in.json: danh sách từ phải có đủ) */
const fs = require('fs'); const [f, inp] = process.argv.slice(2);
const lines = fs.readFileSync(f, 'utf8').split('\n').filter(x => x.trim()); const errs = []; const got = new Map();
lines.forEach((ln, i) => {
  let o; try { o = JSON.parse(ln); } catch { errs.push(`dòng ${i + 1}: JSON hỏng`); return; }
  const tag = `dòng ${i + 1} (${o.w})`;
  for (const k of ['w', 'p', 'vi', 'd', 'e']) if (!o[k]) errs.push(`${tag}: thiếu ${k}`);
  if (!Array.isArray(o.e) || o.e.length !== 2 || o.e.some(x => !Array.isArray(x) || x.length !== 2 || !x[0] || !x[1])) { errs.push(`${tag}: e phải là 2 cặp [en, vi]`); return; }
  if (String(o.vi).split(/\s+/).length > 9) errs.push(`${tag}: vi quá dài`);
  if (String(o.d).split(/\s+/).length > 22) errs.push(`${tag}: d quá dài`);
  const w = String(o.w).toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim();
  const re = new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+') + '([^a-z]|$)', 'i');
  o.e.forEach(([en], k) => { if (!re.test(en)) errs.push(`${tag}: ví dụ ${k + 1} không chứa đúng từ "${w}"`); const n = en.split(/\s+/).length; if (n < 4 || n > 20) errs.push(`${tag}: ví dụ ${k + 1} dài ${n} từ (cần 4–20)`); });
  if (o.lv && !/^(A1|A2|B1|B2|C1|C2)$/.test(o.lv)) errs.push(`${tag}: lv sai`);
  got.set(o.w + '|' + o.p, (got.get(o.w + '|' + o.p) || 0) + 1);
});
if (inp) { const want = JSON.parse(fs.readFileSync(inp, 'utf8')); const miss = want.filter(x => !got.has(x.w + '|' + x.p)); if (miss.length) errs.push(`thiếu ${miss.length} mục: ` + miss.slice(0, 15).map(x => x.w + '|' + x.p).join(', ')); }
console.log(errs.length ? errs.slice(0, 60).join('\n') + `\n${errs.length} lỗi` : `OK ${lines.length} mục`);
