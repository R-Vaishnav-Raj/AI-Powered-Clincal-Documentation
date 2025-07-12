# 🩺 AI-Powered Clinical Documentation Assistant

## Overview

This project tackles a major issue in healthcare: **physician burnout caused by time-consuming clinical documentation**. It automates the creation of structured clinical notes by processing uploaded doctor–patient conversation audio and turning it into summarized, structured data — ready for storage and review.

---

## 🚀 Features

- **Audio Upload via Web Interface**  
  Users upload recorded doctor–patient conversations through a simple frontend interface.

- **Automatic Transcription (AssemblyAI)**  
  Audio is sent to AssemblyAI for accurate speech-to-text conversion.

- **Conversation Summarization**  
  The transcript is processed using a large language model to generate a clean, concise summary.

- **AI-Powered Entity Extraction & Storage**  
  A single AI agent:
  - Extracts structured key medical information (e.g., symptoms, diagnosis, medications)
  - Formats it into key-value pairs
  - Stores the summary and extracted data directly in **Supabase**

---

## 🔧 Tech Stack

| Area                      | Tools Used                         |
|---------------------------|------------------------------------|
| Automation & Orchestration| `n8n`                              |
| Speech Recognition        | `AssemblyAI`                       |
| Summarization & NLP       | `OpenAI API` / LLM Agent           |
| Database & Backend        | `Supabase`                         |
| Frontend Framework        | `Next.js`                          |
| Styling                   | `Tailwind CSS`                     |

---

## 🧩 Workflow Architecture

This project is powered by **n8n**, orchestrating an automated pipeline from audio upload to structured clinical data output.

### 🔄 Workflow Steps:

1. **Audio Upload (via Website)**  
   A recorded conversation is uploaded to the web interface built with Next.js and Tailwind CSS.

2. **Webhook Trigger**  
   Upload triggers the `n8n` workflow to begin processing.

3. **AssemblyAI Integration**  
   The audio is sent to AssemblyAI for transcription.

4. **Transcription Polling & Wait**  
   The workflow waits for transcription to complete and retrieves the final transcript.

5. **Field Formatting**  
   The raw transcript is cleaned and prepped for AI input.

6. **Summary Generation (OpenAI)**  
   The transcript is summarized into a meaningful clinical note.

7. **Supabase Storage (Summary)**  
   The summary is stored in Supabase for real-time access.

8. **AI Agent (Entity Extraction + Storage)**  
   A single AI agent:
   - Extracts structured clinical data (e.g., vitals, medications, diagnoses)
   - Formats it into key-value pairs
   - Stores everything in Supabase as structured rows

### 🖼️ Visual Workflow

![n8n Workflow](./assets/n8n-workflow.png)

---



