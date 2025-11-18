
# 🚀 Groq-Powered Job Seeker's Assistant

A lightweight, developer-friendly web application built with **Python**, **Gradio**, and **Groq APIs**.
This project is currently in **active development**, but you can already self-host it or run it locally.

---

## 📌 Features

* 🔌 **Groq API integration** (LLM inference)
* 🧪 **Simple local development setup**
* 🐳 **Docker support for easy self-hosting**
* ⚙️ **Environment-based configuration via `.env`**
* 💻 **Gradio-based UI**

## Capabilities

* Generate Tailored Resume & Cover Letter  as per Job Description & shared context
* Validate the ATS readiness and provide feedback to optimize the resume.
* Download the generated resume and cover letter in DOCX & PDF Format.
* Write impactful & crisp responses/emails to recruiters based on given context.

---

## 🔑 Environment Variables

This project **requires a Groq API key**.

1. Duplicate `.env.template`
2. Rename the copy to `.env`
3. Fill in your Groq API key:

```
llm.groq.apiKey=your_api_key_here
```

You **must** have this file present for the application to run.

---

# 🧩 Running the App

## Option 1: ▶️ Local Python Development

### 1. Clone the repository

```bash
git clone https://github.com/iam-xtreme/side-projects.git
cd side-projects/jobseeker-assistant
```

### 2. Create a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up environment variables

Copy `.env.template` → `.env`, and add your Groq API key.

### 5. Run the app

```bash
python3  src/app.py
```

The Gradio interface will start automatically and provide a local URL.

---

## Option 2: 🐳 Self-Hosting with Docker

### 1. Build the Docker image

```bash
docker build -t jobseeker-assistant .
```

### 2. Run the container

You must pass your `.env` file:

```bash
docker run --env-file .env -p 7860:7860 jobseeker-assistant
```

Visit: **[http://localhost:7860](http://localhost:7860)**

---

## 🧪 Development Notes

* Hot-reloading is not enabled by default; restart after code changes.
* The project is in **development phase**, APIs or UI may change often.
* Contributions are welcome—feel free to open issues or PRs.

---

## 🛠️ Requirements

* Python 3.13+
* Groq API key
* (Optional) Docker

---

## 📄 License

Add your license here (MIT, Apache-2.0, etc.)
