/**
 * Builds a structured AI prompt for converting PDF documents / lecture slides
 * into complete, well-organized Markdown (.md) files with Mermaid diagrams, KaTeX math,
 * and an optional interactive Lesson Quiz (5-option Multiple Choice + Short Answer)
 * ready to import into Summy.
 */
export function buildPdfToMdPrompt({
  outputLang = "th",
  detailLevel = "complete",
  includeMermaid = true,
  citePages = true,
  includeQuiz = true,
} = {}) {
  if (outputLang === "en") {
    return `You are an expert academic note-taker and technical documentation engineer.
Convert the attached PDF document / lecture slides into a single, comprehensive, well-structured **Markdown (.md)** document ready for reading in a documentation reader (Summy).

---

### 1. Core Completeness Rules (Zero Omission)
- **Read every single page/slide sequentially from start to finish.** Do NOT skip, merge away, or omit any definitions, sub-points, examples, step-by-step traces, tables, formulas, edge cases, or footnotes.
${
  detailLevel === "complete"
    ? "- **100% Complete Coverage:** Preserve all details, explanations, and worked examples in full. Do not over-summarize."
    : "- **Exam-Focused Summary:** Keep all definitions, core concepts, formulas, and key examples, organized concisely for fast review."
}
${
  citePages
    ? "- **Page / Slide Citations:** Always cite the source page or slide number in parentheses at the end of headings and key points, e.g., `(Slide 14)` or `(Pages 14–19)`."
    : ""
}
- If the PDF is too long to fit in a single response, stop cleanly at the end of a major section, state clearly which slide/page you reached (e.g., \`[Completed up to Slide 30 / 65 — reply "continue" for Slides 31–65]\`), and wait for my next message instead of truncating or rushing the remaining pages.

---

### 2. Document Structure & Formatting
Organize the output clearly using this hierarchy:
1. **Document Header:**
   - \`# [Document / Lecture Title]\`
   - A summary blockquote at the top:
     \`> **Scope:** [Total pages/slides & main topics covered]\`
     \`> **Key Takeaways:** [3–5 bullet points of the most important concepts]\`
2. **Section Hierarchy:**
   - Use \`## 1. Main Topic\` for major chapters/modules.
   - Use \`### 1.1 Subtopic (Slide X)\` for specific concepts.
   - Use \`####\` for detailed breakdowns or worked examples.
   - Insert horizontal rules (\`---\`) between major \`##\` sections.
3. **Tables & Callouts:**
   - Use **Markdown Tables** (\`| Column | Column |\`) whenever comparing concepts, listing parameters, grading rubrics, or state transitions.
   - Use **Blockquotes** for important callouts:
     - \`> 💡 **Key Concept:** ...\`
     - \`> ⚠️ **Important / Common Pitfall:** ...\`
     - \`> 📌 **Example (Slide X):** ...\`
4. **Math & Code:**
   - Write mathematical expressions in LaTeX: inline \`$...$\` and display blocks \`$$...$$\`.
   - Wrap code or pseudocode in fenced code blocks with language tags (\`\`\`python, \`\`\`sql, \`\`\`c, etc.).

---

### 3. Visuals, Diagrams, Charts & Images
${
  includeMermaid
    ? `Whenever a slide/page contains a **diagram, flowchart, architecture, process flow, state machine (DFA/NFA/PDA), sequence diagram, ER diagram, class hierarchy, mindmap, or chart/graph**, convert it directly into a **Mermaid (\`\`\`mermaid)** block so the reader can render it visually:
- Choose the appropriate diagram type:
  - \`flowchart TD\` or \`flowchart LR\` for processes, workflows, system architectures, and hierarchies.
  - \`stateDiagram-v2\` for state machines, automata (DFA/NFA), and state transitions.
  - \`sequenceDiagram\` for interactions/protocols over time.
  - \`classDiagram\` or \`erDiagram\` for object/database schemas.
  - \`xychart-beta\` or \`pie\` for quantitative charts/graphs.
- **Strict Mermaid Syntax Rules (to prevent render errors):**
  1. **Always wrap node labels and edge labels in double quotes** whenever they contain spaces, parentheses \`()\`, brackets \`[]\`, colons \`:\`, math symbols, or non-ASCII text.
     - Correct: \`q1["Start State (q1)"] -->|"input: 0"| q2["Accept State (q2)"]\`
     - Incorrect: \`q1[Start State (q1)] -->|0, 1| q2[Accept State (q2)]\`
  2. Avoid HTML tags (\`<br>\`, \`<b>\`) inside Mermaid labels.`
    : "- Describe all diagrams, charts, and figures in structured bullet points or tables."
}
- For complex photographs, screenshots, or illustrations that cannot be fully represented as a graph:
  - Provide a detailed visual breakdown callout:
    \`> 🖼️ **[Figure Description — Slide X]:** [Explain what the image shows, all labels/axes/arrows, and the conclusion it illustrates]\`
  - If an image file/URL is referenced, also include standard Markdown image syntax: \`![Caption (Slide X)](image-filename-or-url)\`.
${
  includeQuiz
    ? `
---

### 4. Interactive End-of-Lesson Quiz (\`\`\`summy-quiz)
At the very end of the Markdown document, generate a comprehensive quiz inside a single \`\`\`summy-quiz code block containing valid JSON (so Summy can render an interactive quiz modal from a button in the reader without cluttering the reading view):
- **Scale the number of questions to the depth and length of the material:**
  - Short lesson: ~5–8 Multiple Choice + 2–3 Short Answer
  - Medium lesson: ~10–15 Multiple Choice + 3–5 Short Answer
  - Long/dense lesson: ~15–25 Multiple Choice + 5–8 Short Answer (covering every major section)
- **Include BOTH question types:**
  1. \`"mcq"\`: **5-option Multiple Choice questions** (\`options\` MUST be an array of **exactly 5 strings**, \`answer\` is the 0-based index \`0\`–\`4\` of the correct option, and \`explanation\` explains why the answer is correct and why distractors are wrong, with slide/page reference).
  2. \`"short"\`: **Short-Answer / Analytical questions** (\`question\` is the prompt, and \`answer\` is the complete model answer / key grading points with slide/page reference).
- **Exact JSON format inside \`\`\`summy-quiz:**
\`\`\`summy-quiz
{
  "mcq": [
    {
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
      "answer": 0,
      "explanation": "Detailed explanation of the correct answer (Slide X)."
    }
  ],
  "short": [
    {
      "question": "Open-ended / analytical question text here?",
      "answer": "Complete model answer and key points expected (Slide Y)."
    }
  ]
}
\`\`\`
- Ensure the JSON inside \`\`\`summy-quiz is strictly valid JSON (no trailing commas, escape quotes properly).`
    : ""
}

---

### ${includeQuiz ? "5" : "4"}. Output Delivery
- Return the entire result inside a single raw \`\`\`markdown code block (or directly as clean Markdown) so I can copy or save it as a \`.md\` file immediately.`;
  }

  return `คุณคือผู้เชี่ยวชาญด้านการสรุปเนื้อหาวิชาการและการจัดทำเอกสารเทคนิค (Technical Documentation Engineer)
ช่วยแปลงไฟล์ PDF / สไลด์เรียนที่แนบมานี้ ให้เป็นไฟล์ **Markdown (.md)** ที่แยกแต่ละส่วนอย่างชัดเจน อ่านง่าย และเนื้อหาครบถ้วนสมบูรณ์สำหรับนำไปเปิดอ่านในระบบ Summy

---

### 1. กฎเหล็กด้านความครบถ้วน (ห้ามตกหล่นแม้แต่ส่วนเดียว)
- **อ่านและเก็บเนื้อหาเรียงตามลำดับทุกหน้า/ทุกสไลด์ ตั้งแต่หน้าแรกจนถึงหน้าสุดท้าย** ห้ามข้าม ห้ามตัดทอนนิยาม สูตร ทฤษฎี ตัวอย่างการคำนวณ ขั้นตอนการทำงาน (Step-by-step trace) ตารางเปรียบเทียบ กรณีศึกษา หรือหมายเหตุท้ายสไลด์
${
  detailLevel === "complete"
    ? "- **ความละเอียดระดับ 100% (Complete Docs):** เก็บทุกรายละเอียด คำอธิบายขยายความ และตัวอย่างทุกขั้นตอนอย่างครบถ้วน ไม่สรุปย่อจนเสียเนื้อหา"
    : "- **สรุปเน้นจุดสำคัญ/เตรียมสอบ (Exam-Focused):** เก็บนิยาม โครงสร้างหลัก สูตร และตัวอย่างสำคัญครบทุกหัวข้อ แต่เรียบเรียงให้กระชับทบทวนง่าย"
}
- **ภาษาที่ใช้:** อธิบายเป็นภาษาไทยที่อ่านลื่นไหลเข้าใจง่าย โดย **คงคำศัพท์เทคนิค (Technical Terms) ภาษาอังกฤษไว้ในวงเล็บหรือทับศัพท์ตามสไลด์** เพื่อให้ค้นหาและอ้างอิงได้แม่นยำ
${
  citePages
    ? "- **ระบุเลขหน้า/สไลด์อ้างอิงเสมอ:** ใส่หมายเลขสไลด์หรือเลขหน้าไว้ท้ายหัวข้อและเนื้อหาสำคัญ เช่น `(สไลด์ 12)` หรือ `(สไลด์ 14–19)` เพื่อให้ย้อนกลับไปดูไฟล์จริงได้ทันที"
    : ""
}
- หากไฟล์ PDF มีจำนวนหน้ามากเกินกว่าจะตอบจบในครั้งเดียว ให้จบในหัวข้อใหญ่ที่สมบูรณ์ แล้วแจ้งชัดเจนว่า \`[สรุปถึงสไลด์ที่ X จาก Y เรียบร้อยแล้ว — พิมพ์ "ต่อ" เพื่อทำสไลด์ที่เหลือ]\` **ห้ามตัดจบแบบรวบรัดหรือย่อสไลด์ท้ายๆ เด็ดขาด**

---

### 2. โครงสร้างเอกสารและการแยกสัดส่วน (Document Structure)
จัดระเบียบเนื้อหาให้มีลำดับขั้นชัดเจนดังนี้:
1. **ส่วนหัวเอกสาร (Header):**
   - \`# [ชื่อวิชา / ชื่อบทเรียน]\`
   - กล่องสรุปภาพรวมด้านบนสุด:
     \`> **ขอบเขตเนื้อหา:** สรุปจากไฟล์ ... จำนวน X สไลด์/หน้า\`
     \`> **ประเด็นสำคัญ (Key Takeaways):** สรุปแก่นสำคัญของบทนี้ 3–5 ข้อ\`
2. **ลำดับหัวข้อ (Headings):**
   - ใช้ \`## 1. หมวดหมู่หลัก\` สำหรับบทหรือพาร์ทใหญ่ และคั่นระหว่างหมวดใหญ่ด้วยเส้น \`---\`
   - ใช้ \`### 1.1 หัวข้อย่อย (สไลด์ X)\` สำหรับแต่ละประเด็น
   - ใช้ \`####\` สำหรับรายละเอียดเจาะลึกหรือขั้นตอนของตัวอย่าง
3. **ตารางและกล่องเน้นข้อความ (Tables & Callouts):**
   - ใช้ **ตาราง Markdown** (\`| หัวข้อ | รายละเอียด |\`) ทุกครั้งที่มีการเปรียบเทียบ ชนิดข้อมูล เกณฑ์การให้คะแนน หรือตารางสถานะ (Transition Table)
   - ใช้ **Blockquote** เพื่อแยกประเภทข้อความสำคัญ:
     - \`> 💡 **สรุปแนวคิดสำคัญ:** ...\`
     - \`> ⚠️ **ข้อควรระวัง / จุดที่มักสับสน:** ...\`
     - \`> 📌 **ตัวอย่างที่ X (สไลด์ Y):** ...\`
4. **สมการคณิตศาสตร์และโค้ด (Math & Code):**
   - เขียนสมการและสัญลักษณ์คณิตศาสตร์ด้วย LaTeX: แบบแทรกในบรรทัดใช้ \`$...$\` และแบบแยกบรรทัดใช้ \`$$...$$\` (แสดงวิธีทำทีละบรรทัดให้ครบ)
   - หากมีโค้ดหรือ Pseudocode ให้ใส่ใน Code Block พร้อมระบุภาษา (\`\`\`python, \`\`\`sql, \`\`\`javascript ฯลฯ)

---

### 3. การจัดการรูปภาพ แผนผัง และกราฟ (แปลงเป็น Mermaid Graph ได้ทันที)
${
  includeMermaid
    ? `เมื่อในสไลด์มี **แผนผัง (Diagram), Flowchart, โครงสร้างระบบ (Architecture), ลำดับการทำงาน, State Machine (เช่น DFA/NFA/PDA), Sequence Diagram, ER Diagram, Mindmap หรือกราฟข้อมูล** หรือมีเนื้อหาที่อธิบายความสัมพันธ์ซับซ้อน ให้สร้างกราฟด้วย **Mermaid (\`\`\`mermaid)** แทรกลงในเนื้อหาทันที เพื่อให้เว็บเรนเดอร์ออกมาเป็นภาพกราฟอัตโนมัติ:
- เลือกชนิดกราฟให้ตรงกับเนื้อหา:
  - \`flowchart TD\` หรือ \`flowchart LR\` สำหรับขั้นตอนการทำงาน โครงสร้างระบบ หรือแผนผังความคิด
  - \`stateDiagram-v2\` สำหรับ State Machine / Automata และการเปลี่ยนสถานะ
  - \`sequenceDiagram\` สำหรับลำดับการรับ-ส่งข้อมูลระหว่างองค์ประกอบ
  - \`classDiagram\` หรือ \`erDiagram\` สำหรับโครงสร้างคลาสหรือฐานข้อมูล
  - \`xychart-beta\` หรือ \`pie\` สำหรับกราฟแท่ง/กราฟเส้น/สัดส่วนข้อมูล
- **กฎสำคัญในการเขียนโค้ด Mermaid ไม่ให้เกิด Syntax Error:**
  1. **ต้องใส่เครื่องหมายคำพูด \`"..."\` ครอบข้อความใน Node และบนเส้นลูกศรทุกครั้ง** ที่มีภาษาไทย ช่องว่าง วงเล็บ \`()\` เครื่องหมาย \`[]\` หรือสัญลักษณ์พิเศษ
     - ตัวอย่างที่ถูกต้อง: \`q1["สถานะเริ่มต้น (q1)"] -->|"รับค่า 0, 1"| q2["สถานะยอมรับ (q2)"]\`
     - ตัวอย่างที่ผิด: \`q1[สถานะเริ่มต้น (q1)] -->|0, 1| q2[สถานะยอมรับ (q2)]\`
  2. ห้ามใส่แท็ก HTML (เช่น \`<br>\`, \`<b>\`) ลงในชื่อ Node ของ Mermaid`
    : "- อธิบายแผนผังและกราฟทั้งหมดเป็นลำดับขั้นตอนหรือตารางที่ชัดเจน"
}
- หากสไลด์มี **รูปภาพประกอบ ภาพถ่าย หรือแผนภาพซับซ้อน** ที่นอกเหนือจากกราฟ:
  - ให้เขียนกล่องอธิบายภาพอย่างละเอียด:
    \`> 🖼️ **[คำอธิบายภาพประกอบ — สไลด์ X]:** [อธิบายว่าภาพแสดงอะไร แกน/ลูกศร/ส่วนประกอบแต่ละส่วนคืออะไร และสื่อความหมายสำคัญอะไร]\`
  - หากมีไฟล์รูปภาพแยก สามารถใส่แท็กรูปภาพมาตรฐาน \`![คำอธิบายภาพ (สไลด์ X)](ชื่อไฟล์หรือ-url-รูปภาพ)\` ไว้ในตำแหน่งเดียวกันได้เลย
${
  includeQuiz
    ? `
---

### 4. สร้างชุดแบบทดสอบท้ายบทเรียน (\`\`\`summy-quiz)
ที่ท้ายสุดของไฟล์ Markdown ให้สร้างชุดแบบทดสอบวัดความเข้าใจประจำบทเรียนไว้ในบล็อกโค้ด \`\`\`summy-quiz (เป็น JSON ตามโครงสร้างด้านล่าง เพื่อให้ระบบ Summy นำไปสร้างเป็นปุ่มกดทำข้อสอบแบบ Interactive ในหน้าอ่านโดยไม่รกเนื้อหาหลัก):
- **จำนวนข้อให้ปรับตามปริมาณและความลึกของเนื้อหาในบทนั้นๆ อย่างเหมาะสม:**
  - บทสั้น: ปรนัย 5–8 ข้อ + อัตนัย 2–3 ข้อ
  - บทขนาดกลาง: ปรนัย 10–15 ข้อ + อัตนัย 3–5 ข้อ
  - บทยาวหรือเนื้อหาซับซ้อน: ปรนัย 15–25 ข้อ + อัตนัย 5–8 ข้อ (ออกข้อสอบให้ครอบคลุมทุกหัวข้อหลักในบทเรียน)
- **ต้องมีครบทั้ง 2 รูปแบบ:**
  1. \`"mcq"\` (**ปรนัย 5 ตัวเลือก**): แต่ละข้อต้องมี \`options\` เป็นอาเรย์ **5 ตัวเลือกพอดี**, \`answer\` เป็นลำดับข้อที่ถูก (\`0\` ถึง \`4\`) และ \`explanation\` อธิบายเหตุผลของคำตอบที่ถูกและทำไมตัวเลือกหลอกถึงผิด พร้อมระบุเลขสไลด์อ้างอิง
  2. \`"short"\` (**อัตนัย / ตอบคำถามวิเคราะห์**): แต่ละข้อมี \`question\` คือโจทย์คำถาม และ \`answer\` คือแนวคำตอบที่ถูกต้องครบถ้วนพร้อมเกณฑ์ประเด็นสำคัญและเลขสไลด์อ้างอิง
- **รูปแบบ JSON ที่ต้องใส่ไว้ในบล็อก \`\`\`summy-quiz เท่านั้น:**
\`\`\`summy-quiz
{
  "mcq": [
    {
      "question": "คำถามปรนัย...",
      "options": ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3", "ตัวเลือกที่ 4", "ตัวเลือกที่ 5"],
      "answer": 0,
      "explanation": "คำอธิบายเฉลยละเอียดพร้อมเหตุผล (สไลด์ X)"
    }
  ],
  "short": [
    {
      "question": "คำถามอัตนัยหรือโจทย์วิเคราะห์...",
      "answer": "แนวคำตอบและประเด็นสำคัญที่ต้องมีครบถ้วน (สไลด์ Y)"
    }
  ]
}
\`\`\`
- ตรวจสอบให้แน่ใจว่า JSON ภายใน \`\`\`summy-quiz ถูกต้องตามหลัก Syntax 100% (ห้ามมีลูกน้ำเกินหลังสมาชิกตัวสุดท้าย และหากมีเครื่องหมาย \`"\` ในข้อความให้ Escape ด้วย \`\\"\`)`
    : ""
}

---

### ${includeQuiz ? "5" : "4"}. รูปแบบผลลัพธ์ (Output Format)
- ส่งผลลัพธ์ทั้งหมดเป็น Markdown ที่พร้อมคัดลอกไปบันทึกเป็นไฟล์ \`.md\` เพื่อนำเข้าสู่ระบบ Summy ได้ทันที`;
}
