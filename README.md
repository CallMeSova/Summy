# Summy

คลังการเรียนรู้และตัวอ่านเอกสารส่วนตัว (Personal Learning Library & Docs Reader) สำหรับจัดเก็บสไลด์เรียน, ไฟล์ PDF, Markdown และโน้ตสรุป

🔗 **Website:** [https://summy-app.vercel.app](https://summy-app.vercel.app) *(Coming Soon)*

## Features

- **จัดหมวดหมู่ความรู้เป็นระบบ** — แบ่งตาม `วิชา (Subject) → คอร์ส (Course) → บทเรียน (Lesson)` พร้อมติดตามความคืบหน้าการอ่าน
- **สร้างบทเรียนได้ 3 รูปแบบ** — เขียนด้วย Rich Text Editor, นำเข้าไฟล์ Markdown (`.md`) หรืออัปโหลดไฟล์ PDF
- **AI PDF → Markdown Prompt** — ปุ่มคัดลอกและปรับแต่ง Prompt สำหรับนำไปให้ AI แปลงสไลด์/PDF เป็นไฟล์สรุป `.md` แบบไม่ตกหล่น
- **รองรับกราฟ Mermaid & สมการคณิตศาสตร์** — แปลงโค้ด ` ```mermaid ` เป็นแผนผัง SVG และเรนเดอร์สมการ LaTeX (`$...$`) อัตโนมัติ
- **Next.js Docs Reader** — หน้าอ่านเอกสารพร้อมสารบัญด้านขวา, โหมดโฟกัส, ปรับขนาด/ความกว้างตัวอ่าน และเลือกฟอนต์ไทยมีหัวสำหรับอ่านเอกสารยาวๆ
- **ค้นหาด่วน & สำรองข้อมูล** — ค้นหาด้วย `Ctrl + K`, บันทึกบุ๊กมาร์ก, ดูประวัติการอ่าน และ Export / Restore ข้อมูลทั้งหมดเป็นไฟล์ `.zip`
- **รองรับ 2 ภาษา & Dark Mode** — สลับภาษาไทย/อังกฤษ และธีม Light / Dark ได้ทันที

## Tech Stack

- **Next.js** (App Router) + **React**
- **SQLite** (`node:sqlite`)
- **TipTap**, **Marked**, **Mermaid**, **KaTeX**

## Getting Started

```bash
npm install
npm run dev
```

เปิดใช้งานที่ `http://localhost:3000`
