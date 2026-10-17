# C++ Object-Oriented Online Quiz System (Single-File Edition)

A clean, academic C++ mini-project demonstrating core Object-Oriented Programming (OOP) concepts, file I/O streams, and dynamic memory management.

## 🚀 Features
- **Abstract Base Class (`Question`)**: Enforces common interface with pure virtual functions.
- **Derived Classes (`MCQ`, `TrueFalse`)**: Extends base question functionality via inheritance.
- **Dynamic Polymorphism**: Processes heterogeneous questions via `std::vector<Question*>` using runtime vtable dispatch.
- **File Stream Handling**: Reads questions from `questions.txt` and appends results to `results.txt`.
- **Memory Safety**: Virtual destructor `virtual ~Question()` ensures leak-free cleanup.

## 📁 Files Included
- `quiz_simple.cpp`: Compact 130-line version, optimized for lab hardcopy printout and viva review.
- `quiz_system.cpp`: Full single-file edition with interactive console menu.
- `questions.txt`: Delimited questions repository.
- `results.txt`: Candidate score log.
- `HARDCOPY_SUBMISSION_GUIDE.md`: Lab report submission template and viva Q&A.

## 🛠️ How to Compile and Run
```bash
g++ quiz_simple.cpp -o quiz.exe
.\quiz.exe
```
