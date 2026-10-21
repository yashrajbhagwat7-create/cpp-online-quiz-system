# Online Examination & Quiz System (C++ OOP & .NET Web Edition)

A complete, academic Object-Oriented Programming (OOP) mini-project available in two synchronized editions:
1. **🌐 Web Edition (.NET C# / HTML5 / CSS3)**: A modern glassmorphism web interface powered by the C++ OOP logic ported to a standalone .NET HTTP server.
2. **🖥️ Console Edition (C++17)**: The original terminal-based single-file C++ application.

Both editions read and write to the exact same shared database files: [`questions.txt`](file:///H:/MINI_PROJECT_SINGLE_FILE/questions.txt) and [`results.txt`](file:///H:/MINI_PROJECT_SINGLE_FILE/results.txt)!

---

## ⚡ Quick Start: Launch the Webpage (1-Click)

Run the included launcher in Command Prompt or PowerShell:
```cmd
run_web_quiz.bat
```
*(Or in PowerShell: `.\run_web_quiz.ps1`)*

This compiles [`QuizWebServer.cs`](file:///H:/MINI_PROJECT_SINGLE_FILE/QuizWebServer.cs) with the built-in Windows C# compiler (`csc.exe`) and opens the webpage in your browser at:
👉 **http://localhost:5050/**

### 🌟 Web Frontend Features:
- **Responsive Glassmorphism UI**: Dark & Light mode toggle, ambient glowing backdrop.
- **Candidate Onboarding**: Name and roll number validation with Timed Exam vs Practice mode.
- **Dynamic Question Runner**: Interactive MCQ cards, True/False buttons, and Fill-in-the-Blank input.
- **Real-Time Question Palette**: Tracks answered, unanswered, and flagged questions.
- **Instant Celebratory Scorecard**: Confetti animations, circular grade badges, and printable PDF scorecard.
- **Live Leaderboard**: Synchronized in real-time with `results.txt`.
- **Admin Question Authoring**: Add new questions live that append immediately into `questions.txt`.
- **C++ vs .NET OOP Guide**: Complete viva preparation reference.

---

## 🖥️ How to Run the Original C++ Console Version

```bash
g++ -std=c++17 quiz_system.cpp -o quiz_system.exe
.\quiz_system.exe
```

---

## 📁 Files Included
- [`QuizWebServer.cs`](file:///H:/MINI_PROJECT_SINGLE_FILE/QuizWebServer.cs): Self-contained .NET C# Web Server & OOP logic port.
- [`web/index.html`](file:///H:/MINI_PROJECT_SINGLE_FILE/web/index.html): Webpage layout and UI structure.
- [`web/style.css`](file:///H:/MINI_PROJECT_SINGLE_FILE/web/style.css): Modern glassmorphism dark/light design system.
- [`web/app.js`](file:///H:/MINI_PROJECT_SINGLE_FILE/web/app.js): Client-side exam runner and REST API integration.
- [`run_web_quiz.bat`](file:///H:/MINI_PROJECT_SINGLE_FILE/run_web_quiz.bat): 1-Click build & browser launcher.
- [`quiz_system.cpp`](file:///H:/MINI_PROJECT_SINGLE_FILE/quiz_system.cpp): Full single-file C++ console program.
- [`quiz_simple.cpp`](file:///H:/MINI_PROJECT_SINGLE_FILE/quiz_simple.cpp): Compact 130-line C++ version for lab hardcopy printout.
- [`questions.txt`](file:///H:/MINI_PROJECT_SINGLE_FILE/questions.txt): Pipe-delimited questions repository.
- [`results.txt`](file:///H:/MINI_PROJECT_SINGLE_FILE/results.txt): Candidate score log.
- [`WEB_SYSTEM_GUIDE.md`](file:///H:/MINI_PROJECT_SINGLE_FILE/WEB_SYSTEM_GUIDE.md): Web edition documentation & API reference.
