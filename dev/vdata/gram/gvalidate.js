/* node gvalidate.js new-<id>.json : kiểm tra bài ngữ pháp viết lại */
const fs = require('fs'); const f = process.argv[2]; const errs = [];
let o; try { o = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.log('JSON hỏng: ' + e.message); process.exit(1); }
const arr = (k, a, b) => { if (!Array.isArray(o[k]) || o[k].length < a || o[k].length > b) errs.push(`${k}: cần ${a}–${b} mục`); };
if (!o.id) errs.push('thiếu id'); arr('summary', 2, 5); arr('steps', 2, 5); arr('traps', 2, 4); arr('apply', 2, 4); arr('check', 2, 3);
if (!o.idea || o.idea.length > 450) errs.push('idea trống hoặc quá dài (>450 ký tự)'); if (!o.img || o.img.length > 220) errs.push('img trống hoặc quá dài');
(o.steps || []).forEach((s, i) => { if (!s.t || !s.say) errs.push(`steps[${i}] thiếu t/say`); if (s.say && s.say.length > 380) errs.push(`steps[${i}].say quá dài`);
  if (!Array.isArray(s.ex) || s.ex.length < 1 || s.ex.length > 3 || s.ex.some(x => x.length < 2)) errs.push(`steps[${i}].ex cần 1–3 ví dụ [en, vi, why?]`);
  (s.f || []).forEach((x, j) => { if (!Array.isArray(x) || x.length !== 2) errs.push(`steps[${i}].f[${j}] phải là [nhãn, công thức]`); else String(x[1]).split(/\s(?:\+|,|→)\s/).forEach(p => { if (/^[a-z]:/.test(p.trim()) && !/^[svoxnb]:/.test(p.trim())) errs.push(`steps[${i}].f[${j}] màu "${p}" không hợp lệ (chỉ s v o x n b)`); }); }); });
(o.traps || []).forEach((t, i) => { if (t.length !== 3) errs.push(`traps[${i}] cần [sai, đúng, vì sao]`); });
(o.apply || []).forEach((t, i) => { if (t.length !== 2) errs.push(`apply[${i}] cần [en, vi]`); });
(o.check || []).forEach((t, i) => { if (t.length !== 2) errs.push(`check[${i}] cần [hỏi, đáp]`); });
const all = JSON.stringify(o); if (/—/.test(all)) errs.push('Không dùng dấu gạch dài (—)');
console.log(errs.length ? errs.join('\n') : 'OK');
