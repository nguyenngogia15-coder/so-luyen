# Soạn mục từ cho lộ trình từ vựng (người học: sinh viên Việt Nam luyện IELTS)

Mỗi mục từ là MỘT dòng JSON (file .jsonl, UTF-8), đúng các khóa sau:
{"w":"activity","p":"noun","vi":"hoạt động","d":"việc làm có mục đích, thường để vui chơi hoặc rèn luyện","e":[["Swimming is my favourite weekend activity.","Bơi là hoạt động cuối tuần tôi thích nhất."],["The school offers many activities after class.","Trường có nhiều hoạt động sau giờ học."]]}

- w: từ/cụm tiếng Anh, giữ nguyên như danh sách được giao (không đổi chữ hoa/thường).
- p: từ loại tiếng Anh như danh sách giao (noun, verb, adjective, adverb, phrase, ...).
- vi: nghĩa tiếng Việt NGẮN (1–6 chữ), đúng nghĩa phổ biến nhất ỨNG VỚI TỪ LOẠI p và trình độ. Nếu có 2 nghĩa rất hay dùng thì ghi "nghĩa 1; nghĩa 2".
- d: giải thích tiếng Việt dễ hiểu 6–18 chữ (giúp phân biệt với từ gần nghĩa), không lặp lại vi.
- e: đúng 2 câu ví dụ [tiếng Anh, dịch tiếng Việt tự nhiên].
  * Câu tiếng Anh 5–16 từ, tự nhiên, chủ đề đời sống/học tập/IELTS, đúng ngữ pháp, tự viết (không chép từ điển).
  * Mỗi câu PHẢI chứa nguyên văn đúng chữ w (không chia khác đi: động từ để nguyên mẫu, danh từ để đúng dạng w). Ví dụ w="go": "We go to school by bus." chứ không "went".
  * Câu 1 phải có ngữ cảnh rõ đến mức nếu che từ w đi, người học chỉ có thể điền đúng từ đó (dùng để làm bài điền từ có một đáp án duy nhất).
- Không dùng dấu gạch dài (—). Không thêm khóa khác.

Cách làm: viết dần ra file (có thể viết nhiều lần nối tiếp bằng công cụ Write/Bash), mỗi lần khoảng 60–80 mục để khỏi quá dài. Xong chạy kiểm tra:
  node /tmp/claude-0/-home-claude/79890b01-a234-56fc-972b-c62e336ee1c7/scratchpad/vocab/validate.js <file.jsonl> [file danh sách đầu vào nếu có]
Sửa hết lỗi rồi mới xong. Cuối cùng chỉ báo lại 1 dòng: số mục và "OK".
