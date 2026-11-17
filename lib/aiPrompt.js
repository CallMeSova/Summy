/**
 * Builds a structured AI prompt for converting PDF documents / lecture slides
 * into a downloadable, complete Markdown (.md) file with Mermaid diagrams, KaTeX math,
 * and an exhaustive, exam-grade interactive Lesson Quiz (5-option Multiple Choice + Short Answer)
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
    return `You are an expert academic note-taker, university examiner, and technical documentation engineer.
Convert the attached PDF document / lecture slides into a single, comprehensive, well-structured **Markdown (.md) file** ready for importing into Summy.

> 🚨 **CRITICAL OUTPUT REQUIREMENT — DOWNLOADABLE .md FILE:**
> **You MUST save the entire output as an actual downloadable \`.md\` file (UTF-8 encoded, e.g. \`lesson-summary.md\`) using your file-creation / Python / Code Interpreter / Artifact tool and provide the direct download link.**
> Do NOT just reply with plain conversational text. If your interface also displays the text, wrap the entire raw Markdown inside a single \`\`\`\`markdown ... \`\`\`\` block so it can be downloaded or copied as a \`.md\` file with zero formatting loss.

---

### 1. Core Completeness Rules (Zero Omission)
- **Read every single page/slide sequentially from page 1 to the final page.** Do NOT skip, merge away, or omit any definitions, sub-points, examples, step-by-step traces, tables, formulas, edge cases, or footnotes.
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
- If the PDF is too long to fit in one turn, stop cleanly at the end of a major section, state clearly which slide/page you reached, and wait for my confirmation before generating the next part and the final downloadable \`.md\` file.

---

### 2. Document Structure & Formatting
Organize the output clearly using this hierarchy:
1. **Document Header:**
   - \`# [Document / Lecture Title]\`
   - A summary blockquote at the top:
     \`> **Scope:** [Total pages/slides & main topics covered]\`
     \`> **Key Takeaways:** [3–5 bullet points of the most important concepts]\`
2. **Section Hierarchy:**
   - Use \`## 1. Main Topic\` for major chapters/modules, separated by \`---\`.
   - Use \`### 1.1 Subtopic (Slide X)\` for specific concepts.
   - Use \`####\` for detailed breakdowns or worked examples.
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
    ? `Whenever a slide/page contains a **diagram, flowchart, architecture, process flow, state machine (DFA/NFA/PDA), sequence diagram, ER diagram, class hierarchy, mindmap, or chart/graph**, convert it directly into a **Mermaid (\`\`\`mermaid)** block so the reader renders it visually:
- Choose the appropriate diagram type (\`flowchart TD\`, \`flowchart LR\`, \`stateDiagram-v2\`, \`sequenceDiagram\`, \`classDiagram\`, \`erDiagram\`, \`xychart-beta\`).
- **Strict Mermaid Syntax Rules (to prevent render errors):**
  1. **Always wrap node labels and edge labels in double quotes** whenever they contain spaces, parentheses \`()\`, brackets \`[]\`, colons \`:\`, math symbols, or non-ASCII text:
     - Correct: \`q1["Start State (q1)"] -->|"input: 0"| q2["Accept State (q2)"]\`
  2. Avoid HTML tags (\`<br>\`, \`<b>\`) inside Mermaid labels.`
    : "- Describe all diagrams, charts, and figures in structured bullet points or tables."
}
- For complex photographs, screenshots, or illustrations that cannot be fully represented as a graph, provide a detailed callout:
  \`> 🖼️ **[Figure Description — Slide X]:** [Explain what the image shows, all labels/axes/arrows, and the conclusion it illustrates]\`
${
  includeQuiz
    ? `
---

### 4. Exhaustive, Exam-Grade End-of-Lesson Quiz (\`\`\`summy-quiz)
At the very end of the \`.md\` file, generate a **comprehensive, exam-grade question bank** inside a single \`\`\`summy-quiz code block containing valid JSON.
**DO NOT be lazy or generate only a few token questions. You MUST cover EVERY major section (\`##\`) and every key subtopic (\`###\`) in the document:**
- **Mandatory Question Volume (scale strictly with content depth & length):**
  - Generate **at least 2–3 questions per subtopic (\`###\`)**, or **at least 1 question for every 2–3 slides/pages**.
  - Standard lecture/document (15–35 slides): **15–25 Multiple Choice questions + 6–10 Short Answer questions**.
  - Long/dense lecture (35+ slides): **25–40 Multiple Choice questions + 8–15 Short Answer questions**.
- **Required Question Depth & Cognitive Variety (Bloom's Taxonomy):**
  1. **Core Definitions & Theory:** Test exact understanding of definitions, properties, and theorems from every section.
  2. **Comparison & Contrast:** Test differences between related concepts, models, or classifications shown in the slides.
  3. **Application, Step-by-Step Tracing & Calculation:** Include practical exam problems (e.g., tracing state transitions, evaluating formulas, stepping through algorithms/examples).
  4. **Edge Cases & Common Misconceptions:** Test subtle traps and boundary conditions. Make all 4 wrong options (distractors) plausible and realistic.
- **Include BOTH question types in the JSON:**
  1. \`"mcq"\`: **5-option Multiple Choice questions** (\`options\` MUST be an array of **exactly 5 strings**, \`answer\` is the 0-based index \`0\`–\`4\` of the correct option, and \`explanation\` must explain in detail why the correct option is right AND why the other options are wrong, with slide/page citations).
  2. \`"short"\`: **Short-Answer / Analytical Exam questions** (\`question\` is the analytical/problem-solving prompt, and \`answer\` is the complete model answer with bulleted grading checkpoints and slide/page citations).
- **Exact JSON format inside \`\`\`summy-quiz:**
\`\`\`summy-quiz
{
  "mcq": [
    {
      "question": "Detailed exam question text?",
      "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
      "answer": 0,
      "explanation": "Detailed explanation of why Option A is correct and why B–E are incorrect (Slide X)."
    }
  ],
  "short": [
    {
      "question": "In-depth analytical or problem-solving question?",
      "answer": "Complete model answer:\\n- Key point 1...\\n- Key point 2... (Slide Y)."
    }
  ]
}
\`\`\`
- Ensure the JSON inside \`\`\`summy-quiz is strictly valid JSON (no trailing commas, escape inner quotes with \`\\"\`, use \`\\n\` for line breaks inside strings).`
    : ""
}

---

### ${includeQuiz ? "5" : "4"}. Final Delivery Checklist (Must Follow)
1. Verify that **every slide/page from start to finish** is covered in the Markdown sections.
${includeQuiz ? "2. Verify that the `summy-quiz` block covers **every section of the lesson** thoroughly with both 5-option MCQs and Short-Answer questions.\n3." : "2."} **Generate and attach the downloadable \`.md\` file now** so I can click to download it directly.`;
  }

  return `คุณคือผู้เชี่ยวชาญด้านการสรุปเนื้อหาวิชาการ ผู้ออกข้อสอบระดับมหาวิทยาลัย และวิศวกรจัดทำเอกสารเทคนิค (Technical Documentation Engineer)
ช่วยแปลงไฟล์ PDF / สไลด์เรียนที่แนบมานี้ ให้เป็น **ไฟล์เอกสาร Markdown (นามสกุล \`.md\`)** ที่แยกแต่ละส่วนอย่างชัดเจน เนื้อหาครบถ้วน 100% สำหรับนำไปอัปโหลดเข้าสู่ระบบ Summy

> 🚨 **คำสั่งสำคัญที่สุด (CRITICAL REQUIREMENT — ต้องสร้างเป็นไฟล์ \`.md\` ให้กดดาวน์โหลดได้):**
> **ห้ามตอบกลับมาเป็นแค่ข้อความสนทนาธรรมดาเพียงอย่างเดียว! เมื่อสรุปเนื้อหาเสร็จ ให้คุณสร้างและบันทึกผลลัพธ์ทั้งหมดลงเป็นไฟล์จริงนามสกุล \`.md\` (เข้ารหัส UTF-8 เช่น \`summary.md\`) โดยใช้เครื่องมือสร้างไฟล์ / Code Interpreter / Python / Artifact ของคุณ แล้วส่งลิงก์ให้ฉันกด Download ไฟล์ \`.md\` ได้ทันที**
> *(และเผื่อในกรณีที่หน้าจอต้องการแสดงโค้ดควบคู่กัน ให้ครอบเนื้อหา Markdown ทั้งหมดไว้ในบล็อก \`\`\`\`markdown ... \`\`\`\` ก้อนเดียวด้วย เพื่อไม่ให้รูปแบบตารางหรือโค้ดเพี้ยน)*

---

### 1. กฎเหล็กด้านความครบถ้วนของเนื้อหา (ห้ามตกหล่นแม้แต่หน้าเดียว)
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
- หากไฟล์ PDF มีขนาดใหญ่มากจนเกินขีดจำกัดต่อรอบ ให้แจ้งชัดเจนว่าทำถึงสไลด์ไหน แล้วเมื่อครบทุกสไลด์แล้วให้รวมทั้งหมดบันทึกออกมาเป็นไฟล์ \`.md\` ให้ดาวน์โหลด

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
- เลือกชนิดกราฟให้ตรงกับเนื้อหา (\`flowchart TD\`, \`flowchart LR\`, \`stateDiagram-v2\`, \`sequenceDiagram\`, \`classDiagram\`, \`erDiagram\`, \`xychart-beta\`)
- **กฎสำคัญในการเขียนโค้ด Mermaid ไม่ให้เกิด Syntax Error:**
  1. **ต้องใส่เครื่องหมายคำพูด \`"..."\` ครอบข้อความใน Node และบนเส้นลูกศรทุกครั้ง** ที่มีภาษาไทย ช่องว่าง วงเล็บ \`()\` เครื่องหมาย \`[]\` หรือสัญลักษณ์พิเศษ
     - ตัวอย่างที่ถูกต้อง: \`q1["สถานะเริ่มต้น (q1)"] -->|"รับค่า 0, 1"| q2["สถานะยอมรับ (q2)"]\`
  2. ห้ามใส่แท็ก HTML (เช่น \`<br>\`, \`<b>\`) ลงในชื่อ Node ของ Mermaid`
    : "- อธิบายแผนผังและกราฟทั้งหมดเป็นลำดับขั้นตอนหรือตารางที่ชัดเจน"
}
- หากสไลด์มี **รูปภาพประกอบ ภาพถ่าย หรือแผนภาพซับซ้อน** ที่นอกเหนือจากกราฟ ให้เขียนกล่องอธิบายภาพอย่างละเอียด:
  \`> 🖼️ **[คำอธิบายภาพประกอบ — สไลด์ X]:** [อธิบายว่าภาพแสดงอะไร แกน/ลูกศร/ส่วนประกอบแต่ละส่วนคืออะไร และสื่อความหมายสำคัญอะไร]\`
${
  includeQuiz
    ? `
---

### 4. สร้างคลังข้อสอบท้ายบทเรียนแบบเจาะลึกและครอบคลุมทุกหัวข้อ (\`\`\`summy-quiz)
ที่ท้ายสุดของไฟล์ Markdown ให้สร้าง **คลังข้อสอบประจำบทเรียนแบบเข้มข้น** ไว้ในบล็อกโค้ด \`\`\`summy-quiz (เป็น JSON ตามโครงสร้างด้านล่าง เพื่อให้ระบบ Summy นำไปสร้างเป็นปุ่มกดทำข้อสอบแบบ Interactive ในหน้าอ่าน):
- **กฎเหล็กด้านความครอบคลุมและจำนวนข้อ (ห้ามลดทอนจำนวนข้อหรือออกข้อสอบแบบผิวเผินเด็ดขาด):**
  - **ต้องออกข้อสอบให้ครบทุกหมวดหลัก (\`##\`) และทุกหัวข้อย่อยสำคัญ (\`###\`) ที่อยู่ในบทเรียน** ห้ามออกแค่ช่วงต้นบทแล้วข้ามเนื้อหาช่วงกลางหรือช่วงท้ายเด็ดขาด
  - **เกณฑ์จำนวนข้อขั้นต่ำตามสัดส่วนเนื้อหา:**
    - ให้คิดสัดส่วน **อย่างน้อย 2–3 ข้อ ต่อ 1 หัวข้อย่อย (\`###\`)** หรือ **อย่างน้อย 1 ข้อ ต่อทุกๆ 2–3 สไลด์**
    - บทเรียนขนาดกลาง (15–35 สไลด์): **ปรนัย 5 ตัวเลือก อย่างน้อย 15–25 ข้อ + อัตนัยอย่างน้อย 6–10 ข้อ**
    - บทเรียนขนาดใหญ่หรือเนื้อหาเข้มข้น (35+ สไลด์): **ปรนัย 5 ตัวเลือก อย่างน้อย 25–40 ข้อ + อัตนัยอย่างน้อย 8–15 ข้อ**
- **ความลึกและมิติของข้อสอบ (ต้องกระจายให้ครบทั้ง 4 มิติเหมือนข้อสอบจริง):**
  1. **วัดความเข้าใจนิยามและทฤษฎีหลัก (Concept & Definition):** ถามความหมาย คุณสมบัติ เงื่อนไข และหลักการของทุกหัวข้อ
  2. **วัดการเปรียบเทียบและจำแนกความต่าง (Comparison & Contrast):** เปรียบเทียบความต่าง ข้อดี/ข้อจำกัด หรือการเลือกใช้ระหว่างตัวแบบต่างๆ ในบทเรียน
  3. **วัดการนำไปใช้ คำนวณ และไล่การทำงาน (Application, Tracing & Calculation):** โจทย์ให้คำนวณค่าจากสูตร ไล่สเต็ปการทำงาน ไล่สถานะ Automaton หรือวิเคราะห์ผลลัพธ์จากตัวอย่าง
  4. **วัดจุดหลอกและกรณีขอบเขต (Edge Cases & Common Pitfalls):** ออกข้อสอบดักจุดที่คนมักเข้าใจผิด โดย **ตัวลวง (Distractors) ทั้ง 4 ตัวเลือกต้องมีความสมจริงและใกล้เคียงกัน** (ห้ามทำตัวเลือกหลอกที่เดาตัดทิ้งได้ง่ายๆ)
- **ต้องมีครบทั้ง 2 รูปแบบใน JSON:**
  1. \`"mcq"\` (**ปรนัย 5 ตัวเลือก**): แต่ละข้อต้องมี \`options\` เป็นอาเรย์ **5 ตัวเลือกพอดี**, \`answer\` เป็นลำดับข้อที่ถูก (\`0\` ถึง \`4\`) และ \`explanation\` **ต้องอธิบายละเอียดทั้งเหตุผลที่ข้อนั้นถูก และเหตุผลที่ตัวเลือกหลอกข้ออื่นๆ ผิด** พร้อมระบุเลขสไลด์อ้างอิง
  2. \`"short"\` (**อัตนัย / โจทย์วิเคราะห์และแสดงวิธีทำ**): แต่ละข้อมี \`question\` คือโจทย์ที่ให้เขียนอธิบายหลักการ วิเคราะห์เปรียบเทียบ หรือแสดงขั้นตอนวิธีทำ และ \`answer\` คือแนวคำตอบฉบับเต็มพร้อมแยกประเด็นสำคัญที่ต้องมีในการตรวจให้คะแนน (Key Grading Checkpoints) และเลขสไลด์อ้างอิง
- **รูปแบบ JSON ที่ต้องใส่ไว้ในบล็อก \`\`\`summy-quiz เท่านั้น:**
\`\`\`summy-quiz
{
  "mcq": [
    {
      "question": "คำถามปรนัยเชิงลึก...",
      "options": ["ตัวเลือกที่ 1", "ตัวเลือกที่ 2", "ตัวเลือกที่ 3", "ตัวเลือกที่ 4", "ตัวเลือกที่ 5"],
      "answer": 0,
      "explanation": "เฉลยละเอียด: ตัวเลือกที่ 1 ถูกต้องเพราะ... ส่วนตัวเลือก 2–5 ผิดเพราะ... (สไลด์ X)"
    }
  ],
  "short": [
    {
      "question": "คำถามอัตนัยเชิงวิเคราะห์หรือแสดงวิธีทำ...",
      "answer": "แนวคำตอบและประเด็นสำคัญที่ต้องตอบให้ครบ:\\n1. ...\\n2. ... (สไลด์ Y)"
    }
  ]
}
\`\`\`
- ตรวจสอบให้แน่ใจว่า JSON ภายใน \`\`\`summy-quiz ถูกต้องตามหลัก Syntax 100% (ห้ามมีลูกน้ำเกินหลังสมาชิกตัวสุดท้าย หากมีเครื่องหมาย \`"\` ในข้อความให้ Escape ด้วย \`\\"\` และใช้ \`\\n\` แทนการขึ้นบรรทัดใหม่ในสตริง)`
    : ""
}

---

### ${includeQuiz ? "5" : "4"}. คำสั่งส่งมอบงานขั้นสุดท้าย (Final Delivery — ต้องทำตามนี้)
1. ตรวจทานว่าเนื้อหาสรุปครอบคลุมครบทุกหน้า/ทุกสไลด์โดยไม่ตกหล่น
${includeQuiz ? "2. ตรวจทานว่าข้อสอบในบล็อก `summy-quiz` ออกครบทุกหัวข้อหลักและหัวข้อย่อยตามเกณฑ์จำนวนข้อขั้นต่ำ พร้อมเฉลยละเอียด\n3." : "2."} **สร้างและบันทึกเนื้อหาทั้งหมดเป็นไฟล์นามสกุล \`.md\` (เช่น \`summary.md\`) แล้วแนบลิงก์ให้ฉันกด Download ไฟล์ \`.md\` เดี๋ยวนี้เลย**`;
}
