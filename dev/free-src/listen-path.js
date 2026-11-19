/* ===== Lộ trình Listening: 10 bài kỹ năng, mỗi bài có đoạn nghe luyện ngay (máy chấm, không gọi AI) ===== */
const LP_MAP_SVG = `<svg viewBox="0 0 360 260" role="img" aria-label="Bản đồ công viên" style="width:100%;max-width:420px;height:auto;font-family:inherit">
<rect x="2" y="2" width="356" height="256" fill="none" stroke="currentColor" stroke-width="2"/>
<path d="M180 258 V150 M60 150 H300 M180 150 V40" stroke="currentColor" stroke-width="10" stroke-opacity=".18" fill="none"/>
<text x="180" y="252" text-anchor="middle" font-size="12" font-weight="700">ENTRANCE</text>
<ellipse cx="180" cy="40" rx="60" ry="24" fill="none" stroke="currentColor" stroke-dasharray="4 3"/><text x="180" y="44" text-anchor="middle" font-size="11">Lake</text>
<g font-size="15" font-weight="800" text-anchor="middle">
<rect x="100" y="190" width="50" height="34" fill="none" stroke="currentColor"/><text x="125" y="212">A</text>
<rect x="210" y="190" width="50" height="34" fill="none" stroke="currentColor"/><text x="235" y="212">B</text>
<rect x="20" y="130" width="40" height="40" fill="none" stroke="currentColor"/><text x="40" y="155">C</text>
<rect x="300" y="130" width="40" height="40" fill="none" stroke="currentColor"/><text x="320" y="155">D</text>
<rect x="100" y="90" width="50" height="34" fill="none" stroke="currentColor"/><text x="125" y="112">E</text>
<rect x="210" y="90" width="50" height="34" fill="none" stroke="currentColor"/><text x="235" y="112">F</text>
<rect x="250" y="20" width="44" height="34" fill="none" stroke="currentColor"/><text x="272" y="42">G</text></g></svg>`;
const LP_PATH = [
  { id: "lp-predict", t: "Đọc trước câu hỏi và đoán từ cần điền",
    idea: "Trước mỗi phần, đề cho khoảng 30 giây đọc câu hỏi. Người nghe giỏi không ngồi chờ, mà dùng 30 giây đó để *đoán trước*: chỗ trống cần loại từ gì (số, tên, danh từ, động từ), là số ít hay số nhiều, và chủ đề đang nói về gì. Khi đã biết mình đang “săn” một con số hay một danh từ, tai sẽ tự lọc được thông tin cần thiết giữa cả đoạn nói.",
    tips: ["Gạch chân từ khóa quanh chỗ trống (Name, Cost, Day…).", "Ghi nhanh dự đoán: “số”, “ngày”, “danh từ số nhiều”…", "Chú ý mạo từ: “a ___” thì từ cần điền là danh từ số ít đếm được."],
    traps: ["Mải đọc câu hỏi sau mà bỏ lỡ câu đang nghe.", "Đoán xong thì cứng nhắc: nghe thấy đúng loại từ đầu tiên là ghi ngay, dù người nói sau đó sửa lại."],
    pr: { id: "lp-predict-1", sp: { A: { name: "Receptionist", v: "bf_isabella", g: "female", acc: "British", mood: "friendly gym receptionist" } },
      turns: [["A", "Welcome to FitZone. Let me tell you about our membership. The basic plan costs twenty-five pounds a month and lets you use the gym and the pool. Classes like yoga and boxing are included in the premium plan, which is thirty-eight pounds. All new members get a free session with a personal trainer. You'll also need a locker key, which costs five pounds, but you get that back when you leave. Oh, and please bring a towel. We don't provide them."]],
      qs: [{ type: "gap", ins: "Complete the notes. Write ONE WORD AND/OR A NUMBER for each answer.", title: "FitZone membership", items: [
        { n: 1, pre: "Basic plan: £", post: "per month", a: ["25", "twenty-five"] },
        { n: 2, pre: "Basic plan includes the gym and the", post: "", a: ["pool"] },
        { n: 3, pre: "Premium plan includes yoga and", post: "classes", a: ["boxing"] },
        { n: 4, pre: "Free session with a personal", post: "", a: ["trainer"] },
        { n: 5, pre: "Locker key deposit: £", post: "", a: ["5", "five"] },
        { n: 6, pre: "Members must bring a", post: "", a: ["towel"] }] }] } },

  { id: "lp-spell", t: "Đánh vần tên và nghe số",
    idea: "Section 1 gần như luôn có một cái tên được *đánh vần* và vài con số (điện thoại, ngày, giá, mã bưu điện). Đây là điểm dễ ăn nhất nhưng cũng hay mất điểm vì một chữ cái. Bản chất là nghe *từng ký tự*, nên phải quen cách người Anh đọc chữ cái: double L là “LL”, zero có thể đọc là “oh”, và các cặp số dễ nhầm như 13 (thir-TEEN, nhấn sau) và 30 (THIR-ty, nhấn trước).",
    tips: ["“Double” + chữ cái nghĩa là chữ đó lặp hai lần: double S = SS.", "Số điện thoại: “oh” = 0, “double seven” = 77.", "-teen nhấn âm sau và có âm /n/ cuối; -ty nhấn âm đầu, kết thúc bằng /i/."],
    traps: ["Nhầm các chữ cái dễ lẫn: A/E/I, G/J, B/V, M/N.", "Viết 15 thành 50, hoặc 14 thành 40."],
    pr: { id: "lp-spell-1", sp: { A: { name: "Clerk", v: "am_michael", g: "male", acc: "American", mood: "patient office clerk" }, B: { name: "Student", v: "bf_emma", g: "female", acc: "British", mood: "clear, careful speaker" } },
      turns: [["A", "Can I have your surname, please?"], ["B", "Yes, it's Gillespie. G, I, double L, E, S, P, I, E."], ["A", "Thank you. And your student number?"], ["B", "It's 4 8 1 6 0 0 3."], ["A", "And how old are you?"], ["B", "I'm nineteen."], ["A", "When did you start the course?"], ["B", "On the thirteenth of January."], ["A", "And the fee you paid was?"], ["B", "Fifteen pounds fifty."], ["A", "Finally, your postcode?"], ["B", "It's B, N, 7, 3, Q, J."]],
      qs: [{ type: "gap", ins: "Complete the form. Write ONE WORD AND/OR A NUMBER for each answer.", title: "Student registration", items: [
        { n: 1, pre: "Surname:", post: "", a: ["Gillespie"] },
        { n: 2, pre: "Student number:", post: "", a: ["4816003"] },
        { n: 3, pre: "Age:", post: "", a: ["19", "nineteen"] },
        { n: 4, pre: "Start date:", post: "January", a: ["13th", "13", "thirteenth"] },
        { n: 5, pre: "Fee paid: £", post: "", a: ["15.50", "15.5"] },
        { n: 6, pre: "Postcode:", post: "", a: ["BN7 3QJ", "BN73QJ"] }] }] } },

  { id: "lp-change", t: "Bẫy đổi ý: nghe đến hết câu",
    idea: "Đề IELTS cố tình cài *thông tin gây nhiễu*: người nói nêu một đáp án, rồi ngay sau đó sửa lại (“Tuesday… actually, no, Thursday would be better”). Đáp án luôn là thông tin *cuối cùng được xác nhận*. Vì vậy đừng ghi ngay khi vừa nghe thấy một từ khớp, mà phải nghe hết lượt nói, đặc biệt khi gặp các từ báo hiệu đổi ý.",
    tips: ["Từ báo hiệu đổi ý: actually, sorry, I mean, wait, on second thoughts, no, that's wrong, instead.", "Ghi nháp nhẹ cả hai phương án, gạch cái bị loại.", "Câu hỏi của người kia (“Is that OK?”) thường dẫn đến một sự thay đổi."],
    traps: ["Ghi đáp án đầu tiên nghe được.", "Nghe được cả hai rồi phân vân, ghi cả hai (sai luật)."],
    pr: { id: "lp-change-1", sp: { A: { name: "Waiter", v: "bm_lewis", g: "male", acc: "British", mood: "polite restaurant host" }, B: { name: "Customer", v: "af_nicole", g: "female", acc: "American", mood: "indecisive but cheerful" } },
      turns: [["A", "Harbour Grill, how can I help?"], ["B", "Hi, I'd like to book a table for Friday evening."], ["A", "Certainly. For how many people?"], ["B", "Six. Oh, wait, my brother can't come, so five."], ["A", "Five people. What time?"], ["B", "Seven o'clock. Actually, no, make it half past seven. We'll be coming from work."], ["A", "Half past seven. Inside or on the terrace?"], ["B", "The terrace sounds lovely. Hmm, but it might be cold. Let's say inside."], ["A", "Inside. And the name?"], ["B", "Carter. Actually, put it under my husband's name, Fraser. He's paying."]],
      qs: [{ type: "gap", ins: "Complete the booking. Write ONE WORD AND/OR A NUMBER for each answer.", title: "Table booking", items: [
        { n: 1, pre: "Day:", post: "evening", a: ["Friday"] },
        { n: 2, pre: "Number of people:", post: "", a: ["5", "five"] },
        { n: 3, pre: "Time: half past", post: "", a: ["seven", "7"] },
        { n: 4, pre: "Table:", post: "", a: ["inside"] },
        { n: 5, pre: "Name:", post: "", a: ["Fraser"] }] }] } },

  { id: "lp-limit", t: "Điền form và ghi chú: giới hạn số từ",
    idea: "Mỗi bài điền có một mệnh lệnh như *ONE WORD ONLY* hoặc *NO MORE THAN TWO WORDS AND/OR A NUMBER*. Viết thừa một từ là mất điểm, dù đúng ý. Ngoài ra đáp án phải *khớp ngữ pháp* với câu: nếu trước chỗ trống là “several”, đáp án phải là số nhiều. Chính tả cũng được chấm: viết sai một chữ là sai cả câu.",
    tips: ["Đọc kỹ giới hạn từ trước khi nghe; số (25, 1990) tính là một “number”, không tính là từ.", "Kiểm tra số ít, số nhiều và dạng từ cho khớp với câu.", "Không lặp lại từ đã có sẵn trước hoặc sau chỗ trống."],
    traps: ["Viết “a large garden” khi đề chỉ cho hai từ.", "Thiếu -s ở danh từ số nhiều."],
    pr: { id: "lp-limit-1", sp: { A: { name: "Guide", v: "am_fenrir", g: "male", acc: "American", mood: "upbeat museum guide" } },
      turns: [["A", "Our science museum has three floors. On the ground floor, you'll find the space exhibition, where the most popular item is a real moon rock. On the first floor, there's a hall full of old steam engines, which children love because some of them still move. The second floor is mainly for school groups, and it has several interactive laboratories where students can do their own experiments. Before you leave, don't miss the gift shop, which sells model rockets."]],
      qs: [{ type: "gap", ins: "Complete the notes. Write NO MORE THAN TWO WORDS for each answer.", title: "Science museum", items: [
        { n: 1, pre: "Ground floor: the most popular item is a real", post: "", a: ["moon rock"] },
        { n: 2, pre: "First floor: a hall of old", post: "", a: ["steam engines"] },
        { n: 3, pre: "Second floor is mainly used by", post: "", a: ["school groups"] },
        { n: 4, pre: "It has several interactive", post: "", a: ["laboratories"] },
        { n: 5, pre: "The gift shop sells model", post: "", a: ["rockets"] }] }] } },

  { id: "lp-mcq", t: "Trắc nghiệm: nhận ra đáp án đã đổi cách nói",
    idea: "Trong câu trắc nghiệm, đáp án đúng gần như *không bao giờ dùng lại đúng từ* trong bài nghe, mà được *diễn đạt lại* (paraphrase): bài nói “it's too far from the station”, đáp án viết “the location is inconvenient”. Ngược lại, lựa chọn sai thường *có đúng từ* trong bài để bẫy người nghe tìm từ giống. Vì vậy hãy nghe *ý*, không săn *chữ*.",
    tips: ["Trước khi nghe, gạch chân điểm khác nhau giữa A, B, C.", "Nghĩ trước vài cách nói khác của mỗi lựa chọn.", "Cả ba lựa chọn thường đều được nhắc tới; chỉ một cái đúng với câu hỏi."],
    traps: ["Chọn lựa chọn có từ giống y bài nghe.", "Chọn thứ được nhắc tới nhưng bị phủ định (“it's not because of the price”)."],
    pr: { id: "lp-mcq-1", sp: { A: { name: "Ann", v: "bf_isabella", g: "female", acc: "British", mood: "thoughtful student" }, B: { name: "Jack", v: "am_puck", g: "male", acc: "American", mood: "easy-going student" } },
      turns: [["B", "So, did you decide to move out of the student halls?"], ["A", "Yes, I'm moving next month. It's not about the price, really. The halls are actually quite cheap."], ["B", "Is it the noise, then?"], ["A", "Partly, but mainly it takes me almost an hour to get to the engineering building every morning. I'm exhausted before classes even start."], ["B", "Fair enough. Where are you going?"], ["A", "A flat with two other students from my course. We met in the chess club, of all places."], ["B", "Ha. And how will you split the bills?"], ["A", "We've agreed to share everything equally, except the internet. Lily works from home, so she's going to pay for that herself."]],
      qs: [{ type: "mcq", ins: "Choose the correct letter, A, B or C.", items: [
        { n: 1, q: "What is Ann's main reason for moving?", opts: ["The rent is too high.", "The journey to class is too long.", "The halls are too noisy."], a: "B" },
        { n: 2, q: "Ann will live with students she met through", opts: ["her course", "a sports team", "a club"], a: "C" },
        { n: 3, q: "Who will pay for the internet?", opts: ["Lily alone", "Ann alone", "all three equally"], a: "A" },
        { n: 4, q: "When will Ann move?", opts: ["this week", "next month", "next term"], a: "B" }] }] } },

  { id: "lp-match", t: "Nối thông tin (matching)",
    idea: "Bài nối cho một danh sách lựa chọn (A–F) và vài mục cần nối. Thông tin nghe *theo thứ tự các mục*, không theo thứ tự lựa chọn. Bản chất là: với mỗi mục, người nói thường nhắc tới 2–3 lựa chọn, nhưng chỉ một cái là đúng cho mục đó, còn lại là gây nhiễu. Lựa chọn thừa (không dùng) là chuyện bình thường.",
    tips: ["Đọc kỹ danh sách lựa chọn, nghĩ cách nói khác cho từng cái.", "Nghe tên mục (ví dụ “On Monday…”) làm mốc chuyển.", "Mỗi lựa chọn thường chỉ dùng một lần, trừ khi đề nói có thể dùng nhiều lần."],
    traps: ["Nối theo từ đầu tiên nghe được trong đoạn của mục đó.", "Bỏ lỡ mục sau vì vẫn đang nghĩ mục trước."],
    pr: { id: "lp-match-1", sp: { A: { name: "Leader", v: "bm_daniel", g: "male", acc: "British", mood: "energetic summer camp leader" } },
      turns: [["A", "Here's the plan for the week. On Monday, we were going to go kayaking, but the river is too high, so instead we'll do rock climbing at the indoor centre. On Tuesday, we'll take the bus to the coast for a day at the beach. Wednesday is our cooking day. You'll learn to make pizza from scratch, and yes, you get to eat it. On Thursday, there's a choice between football and swimming, but most of you voted for a treasure hunt in the forest, so that's what we'll do. And on Friday, we'll finish with a talent show in the evening."]],
      qs: [{ type: "match", ins: "What activity is planned for each day? Choose the correct letter, A–G.", opts: ["kayaking", "rock climbing", "a beach trip", "making pizza", "football", "a treasure hunt", "a talent show"], items: [
        { n: 1, q: "Monday", a: "B" },
        { n: 2, q: "Tuesday", a: "C" },
        { n: 3, q: "Wednesday", a: "D" },
        { n: 4, q: "Thursday", a: "F" },
        { n: 5, q: "Friday", a: "G" }] }] } },

  { id: "lp-map", t: "Bản đồ và sơ đồ: từ chỉ phương hướng",
    idea: "Bài bản đồ luôn có *điểm xuất phát* (thường là lối vào) và người nói dẫn đường lần lượt. Bản chất là đặt ngón tay lên điểm xuất phát rồi *đi theo lời nói*. Phải thuộc các cụm chỉ vị trí: opposite (đối diện), next to (cạnh), in front of / behind (trước / sau), at the end of (cuối đường), on your left / right (bên trái / phải, tính theo hướng đang đi).",
    tips: ["Xác định ngay lối vào và hướng “đi lên” trên bản đồ.", "Trái, phải tính theo người đang đi, không phải theo tờ giấy.", "Các địa điểm được mô tả theo thứ tự câu hỏi."],
    traps: ["Nhầm opposite (đối diện) với next to (bên cạnh).", "Quên đổi trái, phải khi người nói quay đầu."],
    map: LP_MAP_SVG,
    pr: { id: "lp-map-1", sp: { A: { name: "Ranger", v: "af_heart", g: "female", acc: "American", mood: "friendly park ranger" } },
      turns: [["A", "OK, you're standing at the entrance at the bottom of the map. Walk up the main path. The first building on your left is the café, and opposite it, on your right, is the bike hire shop. Keep going until you reach the crossroads. If you turn left there and walk to the end of the path, you'll find the toilets. Go back to the crossroads and continue straight on towards the lake. Just before the lake, on your right, there's the visitor centre. And the boat house is beside the lake, on the right-hand side."]],
      qs: [{ type: "match", ins: "Label the map. Choose the correct letter, A–G.", opts: ["A", "B", "C", "D", "E", "F", "G"], items: [
        { n: 1, q: "café", a: "A" },
        { n: 2, q: "bike hire shop", a: "B" },
        { n: 3, q: "toilets", a: "C" },
        { n: 4, q: "visitor centre", a: "F" },
        { n: 5, q: "boat house", a: "G" }] }] } },

  { id: "lp-signpost", t: "Từ báo hiệu trong bài giảng",
    idea: "Bài giảng (Section 4) dài và không có người hỏi đáp để ngắt nhịp. Bù lại, giảng viên dùng *từ báo hiệu* (signposting) như biển chỉ đường: “Firstly…”, “Another reason is…”, “However…”, “To sum up…”. Nghe được biển báo là biết đáp án tiếp theo sắp tới và nó thuộc ý nào, nên không bị lạc giữa chừng.",
    tips: ["Liệt kê: firstly, secondly, another, finally.", "Đối lập: however, but, on the other hand, in contrast.", "Nguyên nhân, kết quả: because of, as a result, this led to.", "Nhấn mạnh: the key point, most importantly, what's interesting is."],
    traps: ["Nghe từng từ thay vì nghe khung bài.", "Bỏ lỡ đáp án ngay sau “however” (thường là ý quan trọng)."],
    pr: { id: "lp-signpost-1", sp: { A: { name: "Lecturer", v: "bm_george", g: "male", acc: "British", mood: "calm lecturer" } },
      turns: [["A", "Today I'll explain why honey bees are declining. Firstly, there's the loss of habitat. As farms grow larger, there are fewer wild flowers for bees to feed on. Secondly, pesticides. Even small amounts can damage a bee's ability to find its way home. Another major factor is a tiny parasite called the varroa mite, which attacks bees inside the hive. However, the most important point is that these threats work together. A bee that is already weakened by poor food is far more likely to be killed by the mite. To sum up, protecting bees requires action on all three problems at once."]],
      qs: [{ type: "gap", ins: "Complete the notes. Write ONE WORD ONLY for each answer.", title: "Why bees are declining", items: [
        { n: 1, pre: "Loss of habitat: fewer wild", post: "", a: ["flowers"] },
        { n: 2, pre: "Pesticides: bees cannot find their way", post: "", a: ["home"] },
        { n: 3, pre: "Varroa mite: a", post: "that attacks bees", a: ["parasite"] },
        { n: 4, pre: "Most important: the threats work", post: "", a: ["together"] },
        { n: 5, pre: "Weak bees are more likely to be killed by the", post: "", a: ["mite"] }] }] } },

  { id: "lp-who", t: "Section 3: ai nói gì, ai đồng ý",
    idea: "Section 3 là thảo luận học thuật giữa 2–3 người. Câu hỏi thường hỏi *ai* có ý kiến gì, hoặc họ *thống nhất* điều gì. Bản chất là theo dõi *thái độ*: một người đề xuất, người kia đồng ý (“Good idea”, “Exactly”) hay phản đối nhẹ nhàng (“I'm not sure…”, “Maybe, but…”). Ý kiến cuối cùng được cả hai chấp nhận mới là quyết định.",
    tips: ["Nhớ giọng từng người ngay từ đầu (nam/nữ, giọng Anh/Mỹ).", "Từ đồng ý: exactly, good point, that makes sense, I agree.", "Từ phản đối lịch sự: I'm not so sure, I see what you mean, but…, I'd rather…"],
    traps: ["Lấy đề xuất ban đầu làm quyết định cuối.", "Nhầm người nói khi hai giọng giống nhau."],
    pr: { id: "lp-who-1", sp: { A: { name: "Ryan", v: "am_michael", g: "male", acc: "American", mood: "confident student" }, B: { name: "Kate", v: "bf_emma", g: "female", acc: "British", mood: "careful, analytical student" } },
      turns: [["A", "For our presentation on recycling, I think we should start with a shocking statistic."], ["B", "Good idea. That always gets attention."], ["A", "Then I'd like to show a long video about a recycling plant."], ["B", "I'm not so sure. It might bore people. What about a few photos instead?"], ["A", "Hmm, OK, photos it is. And I really think we should give everyone a quiz at the end."], ["B", "I'd rather not. We only have ten minutes. Let's just take questions."], ["A", "Fine. Oh, and I can make the slides."], ["B", "Great, and I'll write the script, since I'm better at that."]],
      qs: [{ type: "mcq", ins: "Choose the correct letter, A, B or C.", items: [
        { n: 1, q: "How will they start the presentation?", opts: ["with a statistic", "with a video", "with a quiz"], a: "A" },
        { n: 2, q: "Instead of a long video, they will use", opts: ["a short video", "photos", "a guest speaker"], a: "B" },
        { n: 3, q: "At the end, they will", opts: ["give a quiz", "take questions", "show a summary video"], a: "B" }] },
        { type: "match", ins: "Who will do each task? Write A for Ryan or B for Kate.", opts: ["Ryan", "Kate"], items: [
          { n: 4, q: "the slides", a: "A" },
          { n: 5, q: "the script", a: "B" }] }] } },

  { id: "lp-lecture", t: "Section 4: theo dõi bài giảng dài",
    idea: "Section 4 dài và chỉ nghe một lần, thường là 10 câu điền ghi chú liên tiếp. Bí quyết là *đọc khung ghi chú như mục lục*: các tiêu đề cho biết bài giảng đi theo thứ tự nào. Khi bỏ lỡ một câu, *bỏ qua ngay* và bám câu tiếp theo, đừng cố nhớ lại, nếu không sẽ mất luôn cả loạt câu sau.",
    tips: ["Đọc trước tất cả tiêu đề và đoán chủ đề từng đoạn.", "Đáp án thường là danh từ cụ thể, nghe theo đúng thứ tự.", "Mất một câu thì đánh dấu, đoán ở cuối bài."],
    traps: ["Đứng lại tiếc câu bị lỡ.", "Viết nguyên cụm dài khi đề chỉ cho một từ."],
    pr: { id: "lp-lecture-1", sp: { A: { name: "Lecturer", v: "af_bella", g: "female", acc: "American", mood: "engaging history lecturer" } },
      turns: [["A", "Today's lecture is about the history of chocolate. Chocolate began in Central America, where the Maya drank it as a bitter liquid, often mixed with chilli. Cocoa beans were so valuable that they were even used as money. In the sixteenth century, Spanish explorers brought chocolate to Europe, where people added sugar to make it sweet. For a long time, it was a drink only the rich could afford. The big change came in the nineteenth century, when a Dutch chemist invented a press that separated cocoa butter from the beans. This made it possible to produce solid chocolate bars. Later, a Swiss company added milk, creating milk chocolate. Today, most cocoa is grown in West Africa, but many farmers there earn very little, which has led to campaigns for fair trade."]],
      qs: [{ type: "gap", ins: "Complete the notes. Write ONE WORD ONLY for each answer.", title: "History of chocolate", items: [
        { n: 1, pre: "The Maya drank it bitter, often mixed with", post: "", a: ["chilli", "chili"] },
        { n: 2, pre: "Cocoa beans were used as", post: "", a: ["money"] },
        { n: 3, pre: "In Europe, people added", post: "", a: ["sugar"] },
        { n: 4, pre: "A Dutch chemist invented a", post: "", a: ["press"] },
        { n: 5, pre: "A Swiss company added", post: "", a: ["milk"] },
        { n: 6, pre: "Most cocoa is now grown in West", post: "", a: ["Africa"] }] }] } }
];
const LP_PASS = 0.7;
