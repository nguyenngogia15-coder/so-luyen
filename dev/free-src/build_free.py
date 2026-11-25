"""Tạo bản web miễn phí (index.html) từ so-luyen-ielts.html: giữ nguyên toàn bộ nội dung, chỉ thêm lớp đăng nhập Google và nối AI/lưu trữ."""
import pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent
src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ROOT.parent / "so-luyen-ielts.html").read_text(encoding="utf-8")
gate_js = (ROOT / "gate.js").read_text(encoding="utf-8")
cfg_js = (ROOT / "site" / "config.js").read_text(encoding="utf-8")

GATE_HTML = """
<div id="gate" role="dialog" aria-modal="true" aria-labelledby="gate-t">
  <div class="gate-card">
    <div class="gate-brand brand"><span class="b9">9.0</span><span class="brand-t"><span class="brand-k">Sổ luyện</span><span>IELTS</span></span></div>
    <h1 id="gate-t">Vào học</h1>
    <p id="gate-msg">Đang kiểm tra đăng nhập…</p>
    <button id="gate-login" class="btn btn-primary btn-big" type="button" hidden>Đăng nhập bằng Google</button>
    <button id="gate-out" class="btn" type="button" hidden>Đăng xuất</button>
  </div>
</div>
<style>
#gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:16px;background:var(--bg)}
#gate[hidden]{display:none}
.gate-card{width:min(440px,100%);border:3px solid var(--edge);box-shadow:8px 8px 0 var(--shadow-c);background:var(--surface);padding:28px 26px;display:flex;flex-direction:column;gap:14px}
.gate-brand{display:flex;align-items:center;gap:10px;text-decoration:none}
#gate .brand{padding:0;border:0;margin:0;min-height:0}
#gate h1{margin:6px 0 0}
#gate p{margin:0;line-height:1.6}
#gate .btn{align-self:flex-start}
#acct{display:flex;align-items:center;gap:8px;font-size:.8rem;min-width:0}
.acct-who{color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}
.acct-out{border:2px solid var(--edge);background:var(--surface);color:var(--ink);font:inherit;font-weight:700;padding:4px 10px;cursor:pointer}
@media (max-width:1099px){.acct-who{display:none}#acct{margin-left:auto}}
@media (min-width:1100px){#acct{flex-direction:column;align-items:stretch;padding:12px 16px 96px;margin-top:auto;border-top:2px dashed var(--line)}.acct-who{max-width:none}}
</style>
<script>
""" + cfg_js + """
</script>
<script type="module">
""" + gate_js + """
</script>
"""

assert src.count("\nboot();\n</script>") == 1, "không tìm thấy lời gọi boot()"
import subprocess as _sp; _sp.run(["python3", str(ROOT / "gen_sync4.py")], check=True, cwd=str(ROOT))
SPEAK = "".join((ROOT / f).read_text(encoding="utf-8") + "\n" for f in ["speak-engine.js", "speak-data-ipa.js", "speak-data-sp.js", "speak-ui.js", "listen-data-1.js", "listen-data-2.js", "listen-data-3.js", "listen-path.js", "listen-ui.js", "align.js", "shadow.js", "nd.js", "room.js", "quota.js", "sync4-gen.js", "sync4.js", "group.js", "fun.js", "tidy.js", "push.js", "mock4.js", "errs4.js", "games.js", "gem.js", "reset.js", "place4.js", "up5.js", "deep.js", "song.js", "voice.js", "rescue.js", "tower.js"])
SPEAK_CSS = (ROOT / "speak.css").read_text(encoding="utf-8") + (ROOT / "listen.css").read_text(encoding="utf-8")
out = src.replace("\nboot();\n</script>", "\nwindow.__bootApp = boot;\n</script>\n<style>\n" + SPEAK_CSS + "</style>\n<script>\n" + SPEAK + "</script>")
i = out.index("<script>", out.index("<body"))
out = out[:i] + GATE_HTML + out[i:]
out = out.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "")
out = out.replace("</title>", "</title>\n<link rel=\"manifest\" href=\"manifest.webmanifest\"><meta name=\"theme-color\" content=\"#111111\"><link rel=\"apple-touch-icon\" href=\"icon-192.png\"><meta name=\"apple-mobile-web-app-capable\" content=\"yes\">", 1)
import re as _re
out = _re.sub(r"\bClaude\b", "AI", out)  # web ngoài dùng Gemini: mọi chữ Claude hiện ra đổi thành AI
(ROOT / "site").mkdir(exist_ok=True)
(ROOT / "site" / "index.html").write_text(out, encoding="utf-8")
(ROOT / "site" / "config.js").write_text((ROOT / "config.js").read_text(encoding="utf-8"), encoding="utf-8") if not (ROOT / "site" / "config.js").exists() else None
import subprocess; subprocess.run(["node", str(ROOT / "export_bank.js")], check=True)
print("ok", len(out))
