# QuizMaster .NET: Web-Based Online Quiz System
## Powered by C++ OOP Core Logic Ported to .NET Framework (C#)

---

## 🌟 Overview & Highlights

The **QuizMaster .NET Online Examination System** brings the robust, academic Object-Oriented C++ exam logic from [`quiz_system.cpp`](file:///H:/MINI_PROJECT_SINGLE_FILE/quiz_system.cpp) into a modern, responsive web application with a glassmorphism frontend.

### Key Architectural Strengths:
1. **Zero External Dependencies**: Compiles directly with Windows built-in .NET C# compiler (`csc.exe`). No Node.js, npm, or complex package managers required.
2. **Identical OOP Principles**: Pure virtual abstraction, hierarchical inheritance, and dynamic polymorphism are cleanly ported 1:1 from C++ to C#.
3. **Dual-Engine Flat-File Persistence**: Reads from [`questions.txt`](file:///H:/MINI_PROJECT_SINGLE_FILE/questions.txt) and appends to [`results.txt`](file:///H:/MINI_PROJECT_SINGLE_FILE/results.txt). Tests taken on the web interface or the console C++ app share the exact same audit records in real-time!
4. **Interactive Glassmorphism Frontend**:
   - Modern dark/light theme toggle.
   - Smooth candidate onboarding (Name and University Roll Number).
   - Dynamic Question Palette with real-time state tracking (Answered, Flagged, Unanswered).
   - Real-time countdown timer with visual warnings.
   - Instant score celebration with confetti animations, percentage grading, and printable scorecard.
   - Live Leaderboard with search and ranking badges (🥇 Gold, 🥈 Silver, 🥉 Bronze).
   - Admin Question Authoring to add new MCQs, True/False, and Fill-in-the-Blank questions live.
   - Side-by-side C++ vs C# OOP architecture guide and viva question bank.

---

## 🚀 How to Run in 1 Step

Double-click or run from command prompt:
```cmd
run_web_quiz.bat
```
*(Or in PowerShell: `.\run_web_quiz.ps1`)*

This script:
1. Compiles [`QuizWebServer.cs`](file:///H:/MINI_PROJECT_SINGLE_FILE/QuizWebServer.cs) into `QuizWebServer.exe` using `csc.exe`.
2. Starts the self-hosted HTTP server on port `5050`.
3. Automatically launches your default web browser to:
   👉 **http://localhost:5050/**

---

## 🏛️ OOP Architecture: C++ vs C# .NET Parity

| OOP Concept | C++ Implementation (`quiz_system.cpp`) | .NET C# Implementation (`QuizWebServer.cs`) |
| :--- | :--- | :--- |
| **Data Abstraction** | Pure virtual functions (`virtual bool checkAnswer(...) const = 0;`) | Abstract methods (`public abstract bool CheckAnswer(string userAns);`) |
| **Inheritance** | `class MCQQuestion : public Question` | `public class MCQQuestion : Question` |
| **Dynamic Polymorphism** | Runtime vtable dispatch via `vector<Question*>` | Runtime CLR dynamic dispatch via `List<Question>` |
| **Memory Safety** | Virtual destructor `virtual ~Question() {}` | CLR Generational Garbage Collector (GC) |
| **Data Persistence** | `ifstream fin;` and `ofstream fout(ios::app);` | `File.ReadAllLines` and `File.AppendAllText` |
| **Scorecard Formatting** | Overloaded stream operator `operator<<` | Encapsulated `User` entity & dynamic JSON serialization |

---

## 📡 REST API Reference

The .NET backend server provides the following endpoints:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Serves the web frontend ([`web/index.html`](file:///H:/MINI_PROJECT_SINGLE_FILE/web/index.html)) |
| `GET` | `/api/status` | Returns server health, active question count, and architecture details |
| `GET` | `/api/questions` | Returns question bank for examination (correct answers withheld for security) |
| `GET` | `/api/questions/all` | Returns question inventory with answers for Admin management |
| `POST` | `/api/submit` | Evaluates answers polymorphically, logs score to `results.txt`, and returns scorecard |
| `GET` | `/api/results` | Parses `results.txt` and returns past candidates sorted newest first |
| `POST` | `/api/questions/add` | Appends a new question directly into `questions.txt` |
| `GET` | `/api/concepts` | Returns C++ vs C# OOP concept mappings for lab viva defense |

---

## 📁 Project File Layout

```
MINI_PROJECT_SINGLE_FILE/
│
├── QuizWebServer.cs         # .NET C# HTTP Server & C++ OOP Core Logic Port
├── QuizWebServer.exe        # Compiled standalone executable
├── run_web_quiz.bat         # 1-Click build & browser launcher (CMD)
├── run_web_quiz.ps1         # 1-Click build & browser launcher (PowerShell)
│
├── web/                     # Modern Frontend Web Assets
│   ├── index.html           # Single-page application structure & modals
│   ├── style.css            # Glassmorphism dark/light design system
│   └── app.js               # Reactive exam controller, timer & API fetch
│
├── quiz_system.cpp          # Original C++ Object-Oriented console program
├── quiz_simple.cpp          # Compact C++ version for hardcopy prints
├── questions.txt            # Shared question bank repository (pipe-delimited)
├── results.txt              # Shared exam audit log and candidate scores
└── README.md                # Main repository documentation
```
