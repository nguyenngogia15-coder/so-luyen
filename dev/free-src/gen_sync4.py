"""Sinh bản 4 kỹ năng của vài hàm trong app gốc (sửa bằng thay chuỗi để giữ nguyên phần còn lại)."""
import re, pathlib
src = pathlib.Path("../so-luyen-ielts.html").read_text(encoding="utf-8")
def fn(name):
    i = src.index("\nfunction " + name + "(") + 1
    j = min(x for x in [src.find("\nfunction ", i + 10), src.find("\n/*", i + 10), src.find("\nconst ", i + 10), src.find("\nlet ", i + 10)] if x > 0)
    return src[i:j].rstrip() + "\n"
def rep(t, a, b):
    assert a in t, (a[:80]); return t.replace(a, b)
out = ["/* Tự sinh từ app gốc bởi gen_sync4.py: bản 4 kỹ năng. Đừng sửa tay. */\n"]
g = fn("goalCard")
g = rep(g, 'const skills = [["reading", "Reading", "#reading"], ["writing", "Writing", "#writing"]];', 'const skills = SK4.map(x => x.slice(0, 3));')
g = rep(g, '"Band Reading ước tính từ 5 bài gần nhất theo bảng quy đổi điểm thô tham khảo; Writing do Claude chấm."', '"Listening và Reading quy đổi từ số câu đúng; Writing và Speaking do AI chấm theo 4 tiêu chí (Speaking lấy 2 lần thi gần nhất)."')
out.append(g)
e = fn("goalEditor")
e = rep(e, '["reading", "writing"].map(k =>', 'SK4.map(x => x[0]).map(k =>')
e = rep(e, '{ reading: "Reading", writing: "Writing" }[k]', '{ listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking" }[k]')
out.append(e)
p = fn("planCard")
p = rep(p, "Lập kế hoạch học IELTS (Reading, Writing, phát âm IPA; không có Listening và Speaking)", "Lập kế hoạch học IELTS đủ 4 kỹ năng (Listening, Reading, Writing, Speaking, kèm phát âm IPA)")
p = rep(p, "band ước tính Reading ${sb.reading ?? \"chưa có\"}, Writing ${sb.writing ?? \"chưa có\"};", "band ước tính Listening ${sb.listening ?? \"chưa có\"}, Reading ${sb.reading ?? \"chưa có\"}, Writing ${sb.writing ?? \"chưa có\"}, Speaking ${sb.speaking ?? \"chưa có\"}; ${sk4Brief()};")
out.append(p)
pathlib.Path("sync4-gen.js").write_text("".join(out), encoding="utf-8")
print("ok", len("".join(out)))
