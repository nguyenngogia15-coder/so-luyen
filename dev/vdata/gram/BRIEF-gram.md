# Viết lại bài ngữ pháp cho dễ hiểu và dùng ngay được

Người học: sinh viên Việt Nam band 4.5–6 luyện IELTS. Bản cũ giảng quá kỹ, dài, khó áp dụng. Bản mới phải: NGẮN, hiểu bản chất bằng một hình ảnh dễ nhớ, rồi đi thẳng vào "muốn nói X thì dùng mẫu Y", có ví dụ IELTS, lỗi người Việt hay mắc, và câu mẫu dùng ngay trong Writing/Speaking. Bỏ hẳn những chi tiết ít dùng hoặc học thuật (chỉ giữ cái giúp làm bài). Viết tiếng Việt tự nhiên, câu ngắn, không dùng dấu gạch dài (—).

Đầu vào: file src-<id>.json (bản cũ: summary, theory_text, slow, exercises). Dùng nó làm nguồn kiến thức, giữ đúng phạm vi bài (đừng thêm chủ điểm của bài khác).

Đầu ra: file new-<id>.json đúng dạng:
{
 "id": "b1",
 "summary": ["2–5 gạch đầu dòng, mỗi dòng một quy tắc dùng ngay, có thể dùng <b>…</b>"],
 "idea": "1–3 câu: bản chất vì sao tiếng Anh như vậy (≤ 450 ký tự). Có thể dùng *từ* để tô đậm.",
 "img": "1 câu hình ảnh để nhớ (≤ 220 ký tự)",
 "steps": [ 2–5 bước, mỗi bước là MỘT tình huống dùng:
   {"t": "Muốn … → dùng …", "f": [["nhãn ngắn", "s:S + v:has + v:V3 + o:O"]], "say": "1–2 câu giải thích khi nào dùng (≤ 380 ký tự)", "ex": [["câu tiếng Anh, tô *phần quan trọng*", "nghĩa tiếng Việt", "vì sao (≤ 1 câu, có thể bỏ)"]]} ],
 "traps": [ 2–4 × ["câu sai người Việt hay viết, tô *chỗ sai*", "câu đúng, tô *chỗ sửa*", "vì sao, 1 câu"] ],
 "apply": [ 2–4 × ["câu mẫu IELTS Writing Task 2/Task 1 hoặc Speaking dùng đúng điểm ngữ pháp này, có thể thay chủ đề để dùng lại", "nghĩa"] ],
 "check": [ 2–3 × ["câu hỏi tự kiểm tra ngắn", "đáp án ngắn có giải thích"] ]
}
Công thức "f": các phần cách nhau bằng " + " (hoặc " → "); mỗi phần có thể gắn màu bằng tiền tố: s: (chủ ngữ, danh từ), v: (động từ), o: (tân ngữ, tính từ, số liệu), b: (chỗ cần nhớ), x: (từ cố định), n: (sai). Chỉ dùng các tiền tố này. "f" có thể bỏ nếu bước không cần công thức.
Ví dụ tiếng Anh phải đúng 100%, tự nhiên, ưu tiên chủ đề IELTS (giáo dục, môi trường, công nghệ, sức khỏe, đô thị…). Mỗi câu chỉ có một cách hiểu.

Xong mỗi bài chạy: node /tmp/claude-0/-home-claude/79890b01-a234-56fc-972b-c62e336ee1c7/scratchpad/vocab/gram/gvalidate.js <file> và sửa đến khi OK. Cuối cùng chỉ báo lại danh sách id đã xong.
