# Bàn giao (19/11/2026) – việc đang làm dở

## Đã xong và đã đưa lên web ngoài
Shadowing (+YouTube), căn câu chính xác (HuBERT, chạy luồng nền proxy), nghe chép sửa lệch, chặng "Nói liền" (7 bài),
Số & đánh vần (240 câu), phòng thi Speaking, đồng bộ 4 kỹ năng (Hôm nay/Lộ trình/Phân tích), bảng lượt AI, hạ tier bài chấm ngắn.
Worker mới (worker.js trong free-src) đã gửi người dùng, cần dán + Deploy.

## Đang làm dở: yêu cầu ngày 19/11 19:36
1. Lộ trình từ vựng giống forumflashstudy.com (cả HAI web: web riêng claude.ai artifact TuDkGM7vAwvsQRiTDVb3z5 và web ngoài):
   - Tab "Theo CEFR": A1→B2 theo Oxford (danh sách vocab/cefr/all.json, 4538 mục, có IPA). Bài tăng dần 12→27 mục, sắp a→z mỗi cấp.
   - Tab "Theo chủ đề": 25 chủ đề (vocab/topics.json) × 10 bài cỡ 10,12,14,16,18,20,22,24,28,36 = 200 mục/chủ đề.
   - Mỗi bài tối đa 10 sao: Học thẻ 1★ (mặt trước từ+IPA+từ loại, lật: nghĩa, gợi ý, câu ví dụ che từ; nút Cần ôn/Đã nhớ),
     Bài tập 3★ (BẮT BUỘC; người dùng chọn: SAI 1 LẦN LÀ LÀM LẠI TỪ ĐẦU; lần 1 qua 3★, lần 2 2★, sau đó 1★),
     tuỳ chọn Nghe viết 3★, Phát âm 3★. Qua Học thẻ + Bài tập thì mở bài sau. Có "Thi vượt cấp" 30 câu (25 bài tập + 5 nghe viết, đúng ≥25 mở hết).
   - Nội dung mỗi mục (định dạng trong vocab/BRIEF-vocab.md): w,p,vi,d,e[[en,vi],[en,vi]],lv. Soạn bằng trợ lý chạy song song
     (người dùng đã đồng ý): 12 lô CEFR vocab/cefr/in-NN.json → out-NN.jsonl (đã dừng giữa chừng, kiểm tra bằng vocab/validate.js),
     25 chủ đề chưa bắt đầu.
   - Âm thanh từ: dùng gói voice/uk,ukf,us,usf sẵn có; thiếu thì Kokoro.
2. Viết lại HẾT 42 bài ngữ pháp cho dễ hiểu, dùng ngay (xóa bớt phần thừa) cho cả hai web: hướng dẫn vocab/BRIEF-gram.md,
   nguồn vocab/gram/src-<id>.json, đầu ra new-<id>.json, kiểm tra gvalidate.js. Thay SLOW[id] + summary, bỏ essenceHtml/SLOWF,
   thêm khối "apply" vào slowCard. Chưa bắt đầu.
