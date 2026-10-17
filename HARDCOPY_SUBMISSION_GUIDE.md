# 📄 Lab Mini Project Hardcopy Submission & Report Guide
**Subject:** Object-Oriented Programming (C++) Lab  
**Project Title:** Online Examination and Quiz System  

---

## 1. Aim of the Project
To design and implement an automated **Online Examination and Quiz System** in C++ that reads heterogeneous question types from an external file, conducts an interactive test session, evaluates answers dynamically at runtime, calculates grades, and persists candidate scores, thereby demonstrating the core principles of Object-Oriented Programming (OOP).

---

## 2. Hardware and Software Specifications
* **Operating System:** Windows 10 / 11 / Linux
* **Programming Language:** C++ (Standard C++17)
* **Compiler:** GNU Compiler Collection (`g++` v15.2 / MinGW-w64)
* **Storage Requirement:** Minimal (< 2 MB for binary and data files)
* **Input Devices:** Keyboard, Console Terminal

---

## 3. Mapping of OOP Concepts in the Source Code

When printing or submitting the code, you can highlight these specific sections in `quiz_system.cpp`:

| OOP Concept | Section in `quiz_system.cpp` | Implementation Details |
| :--- | :--- | :--- |
| **Data Abstraction** | Section 2 (`Question` class) | Abstract Base Class with pure virtual functions: `display() = 0`, `checkAnswer() = 0`, `serialize() = 0`. |
| **Data Encapsulation** | Sections 2, 3, 4 | Attributes (`points`, `score`, `rollNo`, `correctOption`) are `private`/`protected`. Accessed via public methods. |
| **Hierarchical Inheritance** | Section 3 | `MCQQuestion`, `TrueFalseQuestion`, and `FillInBlankQuestion` all inherit publicly from `Question`. |
| **Dynamic Polymorphism** | Section 5 (`QuizManager`) | Generic storage via `std::vector<Question*>`. Methods `q->display()` and `q->checkAnswer()` are dispatched dynamically via the `vtable`. |
| **Virtual Destructor** | Section 2 (`~Question()`) | Guarantees safe polymorphic deallocation of derived objects through base class pointers. |
| **Operator Overloading** | Section 2 & 4 | Overloaded `friend operator<<` for streaming formatted `Question` headers and the `User` score card table. |
| **Custom Exception Handling** | Section 1 (`QuizException`) | Custom inheritance from `std::exception`: `FileNotFoundException`, `InvalidFormatException` handled by `try-catch`. |
| **File Streams (I/O)** | Section 5 (`QuizManager`) | `std::ifstream` parses pipe-delimited (`\|`) questions; `std::ofstream` appends examination results to `results.txt`. |

---

## 4. Class Relationship Diagram

```text
               +----------------------------------+
               |        <<abstract>>              |
               |             Question             |
               +----------------------------------+
               | # id: int                        |
               | # questionText: string           |
               | # points: int                    |
               +----------------------------------+
               | + display()* = 0                 |
               | + checkAnswer(string)* = 0       |
               | + getCorrectAnswer()* = 0        |
               | + serialize()* = 0               |
               +-----------------+----------------+
                                 |
         +-----------------------+-----------------------+
         |                       |                       |
         v                       v                       v
+-------------------+   +--------------------+   +---------------------+
|    MCQQuestion    |   | TrueFalseQuestion  |   | FillInBlankQuestion |
+-------------------+   +--------------------+   +---------------------+
| - options: vector |   | - correctAns: bool |   | - expected: string  |
| - correctOpt: char|   +--------------------+   +---------------------+
+-------------------+   | + display()        |   | + display()         |
| + display()       |   | + checkAnswer()    |   | + checkAnswer()     |
| + checkAnswer()   |   +--------------------+   +---------------------+
+-------------------+

+-----------------------+               +-----------------------+
|         User          |               |      QuizManager      |
+-----------------------+               +-----------------------+
| - name: string        |               | - questions: vector   |
| - rollNo: string      |               |     <Question*>       |
| - score: int          |               +-----------------------+
| - maxScore: int       |               | + loadQuestions()     |
+-----------------------+               | + startQuiz()         |
| + getPercentage()     |               | + addQuestion()       |
| + getGrade()          |               | + displayLeaderboard()|
| + operator<<()        |               +-----------------------+
+-----------------------+
```

---

## 5. Sample Input and Output for Printout

### A. Question Display & Evaluation
```text
============================================================
 [Question 1] (Multiple Choice | 2 Points)
------------------------------------------------------------
 What is the typical size of an empty class object in C++?

   [A] 1 byte
   [B] 0 bytes
   [C] 4 bytes
   [D] Undefined
============================================================
 Your Answer >> A
 >> [CORRECT!] +2 points.
```

### B. Generated Final Scorecard
```text
+-------------------------------------------------------------+
|                     QUIZ SCORE CARD                         |
+-------------------------------------------------------------+
| Student Name      : Alice Smith                             |
| Roll Number       : CS202601                                |
| Total Questions   : 10                                      |
| Correct Answers   : 9                                       |
| Final Score       : 15 / 17                                 |
| Percentage        : 88.24%                                  |
| Performance Grade : A  (Excellent)                         |
+-------------------------------------------------------------+
```

### C. Persistent Scoreboard / Audit Log
```text
+------------------------------------------------------------------------------------------+
|                               EXAMINATION SCORE LOG                                      |
+------------+----------------------+-----------+------------+--------------------+--------+
| Roll No    | Student Name         | Score     | Percentage | Grade              | Time   |
+------------+----------------------+-----------+------------+--------------------+--------+
| CS202601   | Alice Smith          | 15/17     | 88.2%      | A  (Excellent)     | 2026-10-15 10:30:00 |
| CS202602   | Bob Johnson          | 14/17     | 82.4%      | A  (Excellent)     | 2026-10-15 11:15:22 |
| CS202603   | Charlie Brown        | 10/17     | 58.8%      | D  (Pass)          | 2026-10-16 14:05:10 |
+------------+----------------------+-----------+------------+--------------------+--------+
```

---

## 6. Top Viva Voce Questions & Answers

**Q1: Why did you declare `display()` and `checkAnswer()` as pure virtual (`= 0`)?**  
> *Answer:* Because the way a Multiple Choice Question is displayed and evaluated differs fundamentally from a True/False or Fill-in-the-Blank question. Pure virtual functions force every derived class to provide its own concrete implementation while allowing generic processing through base class pointers.

**Q2: What is the significance of the virtual destructor in class `Question`?**  
> *Answer:* If we delete derived objects using base class pointers (`delete q;`), a non-virtual destructor will only invoke the base class destructor. Marking it `virtual ~Question()` ensures that the derived class destructor is called first, preventing memory leaks.

**Q3: How does dynamic polymorphism work at runtime in this code?**  
> *Answer:* When `q->display()` is executed on a `Question*` pointer, C++ uses the hidden `vptr` inside the object to look up the function's memory address in the `vtable` associated with that specific derived type (`MCQQuestion`, `TrueFalseQuestion`, etc.).

**Q4: Why is `operator<<` implemented as a `friend` function rather than a member function?**  
> *Answer:* In stream insertion expressions like `std::cout << user`, the left-hand operand is `std::ostream`, which belongs to the standard library. A member function requires the host class object to be on the left-hand side. Using a `friend` function allows `std::ostream` to appear on the left while granting access to private members.

**Q5: What happens if `questions.txt` does not exist when the program starts?**  
> *Answer:* The program includes an `ensureDefaultQuestionsFile()` safety mechanism that automatically creates a default set of questions if the file is missing, avoiding crashes and throwing a `FileNotFoundException` if write permissions fail.
