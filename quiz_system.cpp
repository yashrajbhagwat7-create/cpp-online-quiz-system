/**
 * ============================================================================
 *           OBJECT-ORIENTED PROGRAMMING (C++) LAB MINI PROJECT
 *                  ONLINE EXAMINATION & QUIZ SYSTEM
 * ============================================================================
 *
 * Title       : File-Driven Online Examination System
 * Language    : C++ (Standard C++17)
 * Architecture: Single-File Modular OOP Design (Ideal for Lab Hardcopy Submission)
 *
 * ----------------------------------------------------------------------------
 *                     OOP CONCEPTS DEMONSTRATED IN THIS CODE
 * ----------------------------------------------------------------------------
 * 1. DATA ENCAPSULATION   : Data members kept private/protected; accessed only
 *                           through public methods and validated getters/setters.
 * 2. DATA ABSTRACTION     : Abstract Base Class 'Question' with pure virtual functions
 *                           enforcing standardized interfaces across question types.
 * 3. INHERITANCE          : Hierarchical inheritance (MCQQuestion, TrueFalseQuestion,
 *                           and FillInBlankQuestion derive from Question).
 * 4. DYNAMIC POLYMORPHISM : Generic processing via std::vector<Question*> using
 *                           runtime dynamic method dispatch through the vtable.
 * 5. VIRTUAL DESTRUCTORS  : Prevents memory leaks during polymorphic deletion.
 * 6. OPERATOR OVERLOADING : Overloaded operator<< for Question and User scorecards.
 * 7. EXCEPTION HANDLING   : Custom exception classes (QuizException, FileNotFoundException,
 *                           InvalidFormatException) wrapped in robust try-catch blocks.
 * 8. FILE STREAMS (I/O)   : File persistence using std::ifstream and std::ofstream.
 * ============================================================================
 */

#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <algorithm>
#include <cctype>
#include <exception>
#include <ctime>

// ============================================================================
// SECTION 1: CUSTOM EXCEPTION HIERARCHY
// Demonstrates: Exception Handling, Inheritance from std::exception
// ============================================================================

class QuizException : public std::exception {
protected:
    std::string message;
public:
    explicit QuizException(const std::string& msg) : message(msg) {}
    virtual const char* what() const noexcept override {
        return message.c_str();
    }
};

class FileNotFoundException : public QuizException {
public:
    explicit FileNotFoundException(const std::string& filename)
        : QuizException("Error: File could not be opened or found: " + filename) {}
};

class InvalidFormatException : public QuizException {
public:
    explicit InvalidFormatException(const std::string& line, int lineNum)
        : QuizException("Error: Corrupted/Malformed record at line " + 
                        std::to_string(lineNum) + ": '" + line + "'") {}
};

// ============================================================================
// SECTION 2: ABSTRACT BASE CLASS (Question)
// Demonstrates: Data Abstraction, Pure Virtual Functions, Virtual Destructor
// ============================================================================

class Question {
protected:
    int id;
    std::string questionText;
    int points;

public:
    Question() : id(0), questionText(""), points(1) {}
    Question(int id, const std::string& text, int points)
        : id(id), questionText(text), points(points) {}

    // Virtual Destructor is mandatory for safe polymorphic deletion
    virtual ~Question() {}

    // Getters
    int getId() const { return id; }
    std::string getQuestionText() const { return questionText; }
    int getPoints() const { return points; }

    // Pure Virtual Functions (Interface Definition)
    virtual void display() const = 0;
    virtual bool checkAnswer(const std::string& userAnswer) const = 0;
    virtual std::string getType() const = 0;
    virtual std::string getCorrectAnswer() const = 0;
    virtual std::string serialize() const = 0;

    // Operator Overloading: Output stream formatting
    friend std::ostream& operator<<(std::ostream& os, const Question& q) {
        os << "[Q" << q.id << "] (" << q.points << " pt) " << q.questionText;
        return os;
    }

    // Static Utility Methods
    static std::string trim(const std::string& str) {
        const std::string ws = " \t\r\n";
        size_t start = str.find_first_not_of(ws);
        if (start == std::string::npos) return "";
        size_t end = str.find_last_not_of(ws);
        return str.substr(start, end - start + 1);
    }

    static std::string toUpper(const std::string& str) {
        std::string res = str;
        std::transform(res.begin(), res.end(), res.begin(),
                       [](unsigned char c) { return std::toupper(c); });
        return res;
    }

    static std::string toLower(const std::string& str) {
        std::string res = str;
        std::transform(res.begin(), res.end(), res.begin(),
                       [](unsigned char c) { return std::tolower(c); });
        return res;
    }
};

// ============================================================================
// SECTION 3: DERIVED QUESTION CLASSES
// Demonstrates: Hierarchical Inheritance, Function Overriding, Polymorphism
// ============================================================================

/**
 * Derived Class 1: Multiple Choice Question (MCQ)
 */
class MCQQuestion : public Question {
private:
    std::vector<std::string> options;
    char correctOption; // Stored as uppercase 'A', 'B', 'C', or 'D'

public:
    MCQQuestion() : Question(), correctOption('A') {}
    MCQQuestion(int id, const std::string& text, const std::vector<std::string>& opts,
                char correctOpt, int points)
        : Question(id, text, points), options(opts), 
          correctOption(static_cast<char>(std::toupper(correctOpt))) {}

    virtual ~MCQQuestion() override {}

    virtual void display() const override {
        std::cout << "\n============================================================\n";
        std::cout << " [Question " << id << "] (Multiple Choice | " << points 
                  << " Point" << (points > 1 ? "s" : "") << ")\n";
        std::cout << "------------------------------------------------------------\n";
        std::cout << " " << questionText << "\n\n";

        char optLabel = 'A';
        for (const auto& opt : options) {
            std::cout << "   [" << optLabel << "] " << opt << "\n";
            optLabel++;
        }
        std::cout << "============================================================\n";
    }

    virtual bool checkAnswer(const std::string& userAnswer) const override {
        std::string clean = toUpper(trim(userAnswer));
        if (clean.empty()) return false;
        return clean[0] == correctOption;
    }

    virtual std::string getType() const override {
        return "Multiple Choice (MCQ)";
    }

    virtual std::string getCorrectAnswer() const override {
        std::string ans;
        ans += correctOption;
        int idx = correctOption - 'A';
        if (idx >= 0 && idx < static_cast<int>(options.size())) {
            ans += " (" + options[idx] + ")";
        }
        return ans;
    }

    virtual std::string serialize() const override {
        std::string line = "MCQ|" + questionText;
        for (const auto& opt : options) {
            line += "|" + opt;
        }
        line += "|" + std::string(1, correctOption) + "|" + std::to_string(points);
        return line;
    }
};

/**
 * Derived Class 2: True / False Question
 */
class TrueFalseQuestion : public Question {
private:
    bool correctAnswer;

public:
    TrueFalseQuestion() : Question(), correctAnswer(false) {}
    TrueFalseQuestion(int id, const std::string& text, bool correctAns, int points)
        : Question(id, text, points), correctAnswer(correctAns) {}

    virtual ~TrueFalseQuestion() override {}

    virtual void display() const override {
        std::cout << "\n============================================================\n";
        std::cout << " [Question " << id << "] (True / False | " << points 
                  << " Point" << (points > 1 ? "s" : "") << ")\n";
        std::cout << "------------------------------------------------------------\n";
        std::cout << " " << questionText << "\n\n";
        std::cout << "   Options: Enter [T] for True or [F] for False\n";
        std::cout << "============================================================\n";
    }

    virtual bool checkAnswer(const std::string& userAnswer) const override {
        std::string clean = toUpper(trim(userAnswer));
        if (clean.empty()) return false;

        bool userChoice = false;
        if (clean == "T" || clean == "TRUE" || clean == "1") {
            userChoice = true;
        } else if (clean == "F" || clean == "FALSE" || clean == "0") {
            userChoice = false;
        } else {
            return false;
        }
        return userChoice == correctAnswer;
    }

    virtual std::string getType() const override {
        return "True / False";
    }

    virtual std::string getCorrectAnswer() const override {
        return correctAnswer ? "True" : "False";
    }

    virtual std::string serialize() const override {
        return "TF|" + questionText + "|" + (correctAnswer ? "True" : "False") + 
               "|" + std::to_string(points);
    }
};

/**
 * Derived Class 3: Fill in the Blanks Question
 */
class FillInBlankQuestion : public Question {
private:
    std::string expectedAnswer;

public:
    FillInBlankQuestion() : Question(), expectedAnswer("") {}
    FillInBlankQuestion(int id, const std::string& text, const std::string& answer, int points)
        : Question(id, text, points), expectedAnswer(answer) {}

    virtual ~FillInBlankQuestion() override {}

    virtual void display() const override {
        std::cout << "\n============================================================\n";
        std::cout << " [Question " << id << "] (Fill in the Blanks | " << points 
                  << " Point" << (points > 1 ? "s" : "") << ")\n";
        std::cout << "------------------------------------------------------------\n";
        std::cout << " " << questionText << "\n\n";
        std::cout << "   Instruction: Type the missing word or phrase.\n";
        std::cout << "============================================================\n";
    }

    virtual bool checkAnswer(const std::string& userAnswer) const override {
        std::string cleanUser = toLower(trim(userAnswer));
        std::string cleanExpected = toLower(trim(expectedAnswer));
        return cleanUser == cleanExpected;
    }

    virtual std::string getType() const override {
        return "Fill in the Blanks";
    }

    virtual std::string getCorrectAnswer() const override {
        return expectedAnswer;
    }

    virtual std::string serialize() const override {
        return "FIB|" + questionText + "|" + expectedAnswer + "|" + std::to_string(points);
    }
};

// ============================================================================
// SECTION 4: USER & SCORECARD CLASS
// Demonstrates: Encapsulation, Operator Overloading (operator<<)
// ============================================================================

class User {
private:
    std::string name;
    std::string rollNo;
    int score;
    int maxScore;
    int correctCount;
    int totalQuestions;

public:
    User() : name("Candidate"), rollNo("0000"), score(0), maxScore(0),
             correctCount(0), totalQuestions(0) {}

    User(const std::string& name, const std::string& rollNo)
        : name(name), rollNo(rollNo), score(0), maxScore(0),
          correctCount(0), totalQuestions(0) {}

    std::string getName() const { return name; }
    std::string getRollNo() const { return rollNo; }
    int getScore() const { return score; }
    int getMaxScore() const { return maxScore; }
    int getCorrectCount() const { return correctCount; }
    int getTotalQuestions() const { return totalQuestions; }

    void addScore(int points) { score += points; }

    void setQuizStats(int correct, int total, int totalMaxScore) {
        correctCount = correct;
        totalQuestions = total;
        maxScore = totalMaxScore;
    }

    double getPercentage() const {
        if (maxScore <= 0) return 0.0;
        return (static_cast<double>(score) / maxScore) * 100.0;
    }

    std::string getGrade() const {
        double pct = getPercentage();
        if (pct >= 90.0) return "A+ (Outstanding)";
        if (pct >= 80.0) return "A  (Excellent)";
        if (pct >= 70.0) return "B  (Good)";
        if (pct >= 60.0) return "C  (Satisfactory)";
        if (pct >= 50.0) return "D  (Pass)";
        return "F  (Needs Improvement)";
    }

    // Overloaded stream insertion operator for formatted ASCII scorecard
    friend std::ostream& operator<<(std::ostream& os, const User& u) {
        os << "\n+-------------------------------------------------------------+\n";
        os << "|                     QUIZ SCORE CARD                         |\n";
        os << "+-------------------------------------------------------------+\n";
        os << "| Student Name      : " << std::left << std::setw(39) << u.name << " |\n";
        os << "| Roll Number       : " << std::left << std::setw(39) << u.rollNo << " |\n";
        os << "| Total Questions   : " << std::left << std::setw(39) << u.totalQuestions << " |\n";
        os << "| Correct Answers   : " << std::left << std::setw(39) << u.correctCount << " |\n";
        os << "| Final Score       : " << std::left << std::setw(39)
           << (std::to_string(u.score) + " / " + std::to_string(u.maxScore)) << " |\n";

        std::ostringstream pctStream;
        pctStream << std::fixed << std::setprecision(2) << u.getPercentage() << "%";
        os << "| Percentage        : " << std::left << std::setw(39) << pctStream.str() << " |\n";
        os << "| Performance Grade : " << std::left << std::setw(39) << u.getGrade() << " |\n";
        os << "+-------------------------------------------------------------+\n";
        return os;
    }
};

// ============================================================================
// SECTION 5: QUIZ CONTROLLER (QuizManager)
// Demonstrates: Polymorphic Collection, Dynamic Allocation, File I/O Streams
// ============================================================================

class QuizManager {
private:
    std::vector<Question*> questions; // Heterogeneous collection of Question base pointers

    Question* parseLine(const std::string& line, int lineNum) {
        std::stringstream ss(line);
        std::string token;
        std::vector<std::string> tokens;

        while (std::getline(ss, token, '|')) {
            tokens.push_back(Question::trim(token));
        }

        if (tokens.empty()) throw InvalidFormatException(line, lineNum);

        std::string type = Question::toUpper(tokens[0]);
        int newId = static_cast<int>(questions.size()) + 1;

        if (type == "MCQ") {
            if (tokens.size() < 8) throw InvalidFormatException(line, lineNum);
            std::string text = tokens[1];
            std::vector<std::string> opts = {tokens[2], tokens[3], tokens[4], tokens[5]};
            char correctOpt = tokens[6].empty() ? 'A' : tokens[6][0];
            int points = 1;
            try { points = std::stoi(tokens[7]); } catch (...) { points = 1; }
            return new MCQQuestion(newId, text, opts, correctOpt, points);

        } else if (type == "TF") {
            if (tokens.size() < 4) throw InvalidFormatException(line, lineNum);
            std::string text = tokens[1];
            std::string boolStr = Question::toUpper(tokens[2]);
            bool correctBool = (boolStr == "TRUE" || boolStr == "T" || boolStr == "1");
            int points = 1;
            try { points = std::stoi(tokens[3]); } catch (...) { points = 1; }
            return new TrueFalseQuestion(newId, text, correctBool, points);

        } else if (type == "FIB") {
            if (tokens.size() < 4) throw InvalidFormatException(line, lineNum);
            std::string text = tokens[1];
            std::string answer = tokens[2];
            int points = 1;
            try { points = std::stoi(tokens[3]); } catch (...) { points = 1; }
            return new FillInBlankQuestion(newId, text, answer, points);

        } else {
            throw InvalidFormatException("Unknown question type: " + type, lineNum);
        }
    }

public:
    QuizManager() {}

    // Destructor: Clean up dynamically allocated memory (RAII / Rule of Three)
    ~QuizManager() {
        clearQuestions();
    }

    QuizManager(const QuizManager&) = delete;
    QuizManager& operator=(const QuizManager&) = delete;

    void clearQuestions() {
        for (Question* q : questions) {
            delete q; // Calls virtual destructor of derived class properly
        }
        questions.clear();
    }

    size_t getQuestionCount() const { return questions.size(); }

    // Creates a default question file if not already present
    static void ensureDefaultQuestionsFile(const std::string& filePath) {
        std::ifstream checkFile(filePath);
        if (checkFile.is_open()) {
            checkFile.close();
            return; // File already exists
        }

        std::ofstream defaultFile(filePath);
        if (defaultFile.is_open()) {
            defaultFile << "# C++ OOP Quiz Repository (Delimited by |)\n";
            defaultFile << "MCQ|What is the typical size of an empty class in C++?|1 byte|0 bytes|4 bytes|Undefined|A|2\n";
            defaultFile << "TF|A constructor in C++ can be declared as virtual.|False|1\n";
            defaultFile << "MCQ|Which OOP feature is resolved at runtime using a vtable?|Polymorphism|Encapsulation|Abstraction|Data Hiding|A|2\n";
            defaultFile << "FIB|The concept of binding data and functions into a single unit is called _____|encapsulation|2\n";
            defaultFile << "TF|Friend functions can access private members of a class.|True|1\n";
            defaultFile << "MCQ|Which operator CANNOT be overloaded in C++?|:: (Scope Resolution)|+ (Addition)|[] (Subscript)|= (Assignment)|A|2\n";
            defaultFile << "FIB|A class containing at least one pure virtual function is called an _____ class|abstract|2\n";
            defaultFile << "TF|An abstract class can be directly instantiated.|False|1\n";
            defaultFile << "MCQ|What form of inheritance does C++ support that Java does NOT support natively?|Multiple Inheritance|Single Inheritance|Multilevel Inheritance|Hierarchical Inheritance|A|2\n";
            defaultFile << "FIB|The mechanism of deriving a class from an existing class is called _____|inheritance|2\n";
            defaultFile.close();
        }
    }

    void loadQuestions(const std::string& filePath) {
        clearQuestions();
        ensureDefaultQuestionsFile(filePath);

        std::ifstream file(filePath);
        if (!file.is_open()) {
            throw FileNotFoundException(filePath);
        }

        std::string line;
        int lineNum = 0;
        while (std::getline(file, line)) {
            lineNum++;
            std::string trimmed = Question::trim(line);
            if (trimmed.empty() || trimmed[0] == '#') continue;

            Question* q = parseLine(trimmed, lineNum);
            if (q != nullptr) questions.push_back(q);
        }
        file.close();
    }

    void startQuiz(const std::string& studentName, const std::string& rollNo,
                   const std::string& resultsFilePath) {
        if (questions.empty()) {
            std::cout << "\n [!] Error: No questions loaded in the quiz system!\n";
            return;
        }

        User student(studentName, rollNo);
        int totalMaxScore = 0;
        int correctCount = 0;

        for (const auto& q : questions) {
            totalMaxScore += q->getPoints();
        }

        std::cout << "\n============================================================\n";
        std::cout << "               ONLINE EXAMINATION COMMENCED                 \n";
        std::cout << " Candidate : " << studentName << " (Roll: " << rollNo << ")\n";
        std::cout << " Questions : " << questions.size() << " | Total Points: " << totalMaxScore << "\n";
        std::cout << "============================================================\n";

        for (size_t i = 0; i < questions.size(); ++i) {
            Question* q = questions[i];

            // Polymorphic call to display()
            q->display();

            std::cout << " Your Answer >> ";
            std::string userAnswer;
            std::getline(std::cin, userAnswer);

            // Polymorphic call to checkAnswer()
            if (q->checkAnswer(userAnswer)) {
                std::cout << " >> [CORRECT!] +" << q->getPoints() << " points.\n";
                student.addScore(q->getPoints());
                correctCount++;
            } else {
                std::cout << " >> [INCORRECT!] Correct answer was: " 
                          << q->getCorrectAnswer() << "\n";
            }
        }

        student.setQuizStats(correctCount, static_cast<int>(questions.size()), totalMaxScore);

        // Operator Overloading call: std::cout << student;
        std::cout << student;

        // Save result to file
        std::ofstream outFile(resultsFilePath, std::ios::app);
        if (outFile.is_open()) {
            std::time_t now = std::time(nullptr);
            char timeStr[64];
            std::strftime(timeStr, sizeof(timeStr), "%Y-%m-%d %H:%M:%S", std::localtime(&now));

            outFile << student.getRollNo() << "|"
                    << student.getName() << "|"
                    << student.getScore() << "/" << student.getMaxScore() << "|"
                    << std::fixed << std::setprecision(1) << student.getPercentage() << "%|"
                    << student.getGrade() << "|"
                    << timeStr << "\n";
            outFile.close();
            std::cout << " [System] Result recorded successfully in: " << resultsFilePath << "\n";
        }
    }

    void displayAllQuestions() const {
        if (questions.empty()) {
            std::cout << "\n [!] Question bank is empty.\n";
            return;
        }

        std::cout << "\n============================================================\n";
        std::cout << "                 QUESTION BANK INVENTORY                    \n";
        std::cout << "============================================================\n";
        for (const auto& q : questions) {
            q->display(); // Polymorphic call
            std::cout << " [Metadata] Type: " << q->getType()
                      << " | Correct Answer: " << q->getCorrectAnswer() << "\n";
        }
        std::cout << "============================================================\n";
    }

    void addQuestionInteractive(const std::string& filePath) {
        std::cout << "\n============================================================\n";
        std::cout << "                    ADD NEW QUESTION                        \n";
        std::cout << "============================================================\n";
        std::cout << " Select Question Type:\n";
        std::cout << "   1. Multiple Choice Question (MCQ)\n";
        std::cout << "   2. True / False (TF)\n";
        std::cout << "   3. Fill in the Blanks (FIB)\n";
        std::cout << " Choice (1-3): ";

        std::string choiceStr;
        std::getline(std::cin, choiceStr);
        int choice = 1;
        try { choice = std::stoi(choiceStr); } catch (...) { choice = 1; }

        std::cout << " Enter Question Statement: ";
        std::string text;
        std::getline(std::cin, text);

        std::cout << " Enter Points for this question: ";
        std::string ptsStr;
        std::getline(std::cin, ptsStr);
        int points = 1;
        try { points = std::stoi(ptsStr); } catch (...) { points = 1; }

        Question* newQ = nullptr;
        int newId = static_cast<int>(questions.size()) + 1;

        if (choice == 1) {
            std::vector<std::string> opts(4);
            for (int i = 0; i < 4; ++i) {
                char label = static_cast<char>('A' + i);
                std::cout << " Enter Option [" << label << "]: ";
                std::getline(std::cin, opts[i]);
            }
            std::cout << " Enter Correct Option (A, B, C, or D): ";
            std::string optChar;
            std::getline(std::cin, optChar);
            char cOpt = optChar.empty() ? 'A' : std::toupper(optChar[0]);

            newQ = new MCQQuestion(newId, text, opts, cOpt, points);

        } else if (choice == 2) {
            std::cout << " Enter Correct Answer ([T]rue or [F]alse): ";
            std::string tfStr;
            std::getline(std::cin, tfStr);
            std::string clean = Question::toUpper(Question::trim(tfStr));
            bool cBool = (clean == "T" || clean == "TRUE" || clean == "1");

            newQ = new TrueFalseQuestion(newId, text, cBool, points);

        } else if (choice == 3) {
            std::cout << " Enter Expected Word/Phrase: ";
            std::string answer;
            std::getline(std::cin, answer);

            newQ = new FillInBlankQuestion(newId, text, answer, points);

        } else {
            std::cout << " [!] Invalid option selected.\n";
            return;
        }

        if (newQ != nullptr) {
            questions.push_back(newQ);
            std::ofstream outFile(filePath, std::ios::app);
            if (outFile.is_open()) {
                outFile << newQ->serialize() << "\n";
                outFile.close();
                std::cout << "\n [Success] Question appended to '" << filePath << "' successfully!\n";
            }
        }
    }

    void displayLeaderboard(const std::string& resultsFilePath) const {
        std::ifstream inFile(resultsFilePath);
        if (!inFile.is_open()) {
            std::cout << "\n [Info] No examination attempts recorded yet.\n";
            return;
        }

        std::cout << "\n+------------------------------------------------------------------------------------------+\n";
        std::cout << "|                               EXAMINATION SCORE LOG                                      |\n";
        std::cout << "+------------+----------------------+-----------+------------+--------------------+--------+\n";
        std::cout << "| Roll No    | Student Name         | Score     | Percentage | Grade              | Time   |\n";
        std::cout << "+------------+----------------------+-----------+------------+--------------------+--------+\n";

        std::string line;
        bool hasRecords = false;

        while (std::getline(inFile, line)) {
            std::string trimmed = Question::trim(line);
            if (trimmed.empty()) continue;

            std::stringstream ss(trimmed);
            std::string roll, name, score, pct, grade, time;
            if (std::getline(ss, roll, '|') &&
                std::getline(ss, name, '|') &&
                std::getline(ss, score, '|') &&
                std::getline(ss, pct, '|') &&
                std::getline(ss, grade, '|') &&
                std::getline(ss, time, '|')) {

                hasRecords = true;
                std::cout << "| " << std::left << std::setw(10) << roll
                          << " | " << std::left << std::setw(20) << name
                          << " | " << std::left << std::setw(9)  << score
                          << " | " << std::left << std::setw(10) << pct
                          << " | " << std::left << std::setw(18) << grade
                          << " | " << time << " |\n";
            }
        }

        if (!hasRecords) {
            std::cout << "|                           No attempts recorded yet.                                      |\n";
        }
        std::cout << "+------------+----------------------+-----------+------------+--------------------+--------+\n";
        inFile.close();
    }
};

// ============================================================================
// SECTION 6: MAIN INTERACTIVE CONSOLE MENU
// ============================================================================

void printHeader() {
    std::cout << "\n=================================================================\n";
    std::cout << "        C++ OBJECT-ORIENTED ONLINE EXAMINATION SYSTEM            \n";
    std::cout << "                 [Single-File Academic Edition]                  \n";
    std::cout << "=================================================================\n";
}

void printMenu() {
    std::cout << "\n------------------------- MAIN MENU -----------------------------\n";
    std::cout << "  1. Start Quiz / Examination\n";
    std::cout << "  2. View Question Bank (All Questions)\n";
    std::cout << "  3. Add New Question (Admin Mode)\n";
    std::cout << "  4. View Scoreboard & Past Results\n";
    std::cout << "  5. OOP Concepts Demonstrated in this Project\n";
    std::cout << "  6. Reload Questions from File\n";
    std::cout << "  7. Exit\n";
    std::cout << "-----------------------------------------------------------------\n";
    std::cout << " Enter choice (1-7): ";
}

void printOOPConcepts() {
    std::cout << "\n=================================================================\n";
    std::cout << "           OBJECT-ORIENTED PROGRAMMING CONCEPTS MAPPING          \n";
    std::cout << "=================================================================\n";
    std::cout << " 1. ENCAPSULATION:\n";
    std::cout << "    - 'Question', 'User', and 'QuizManager' hide sensitive data\n";
    std::cout << "      behind private/protected access specifiers.\n\n";
    std::cout << " 2. DATA ABSTRACTION:\n";
    std::cout << "    - Base class 'Question' is abstract; contains pure virtual\n";
    std::cout << "      functions (display() = 0, checkAnswer() = 0, etc.).\n\n";
    std::cout << " 3. HIERARCHICAL INHERITANCE:\n";
    std::cout << "    - 'MCQQuestion', 'TrueFalseQuestion', and 'FillInBlankQuestion'\n";
    std::cout << "      derive from the base 'Question' class.\n\n";
    std::cout << " 4. DYNAMIC POLYMORPHISM (vtable & vptr):\n";
    std::cout << "    - 'QuizManager' uses 'vector<Question*>'. Function calls like\n";
    std::cout << "      'q->display()' and 'q->checkAnswer()' are dispatched at runtime.\n\n";
    std::cout << " 5. VIRTUAL DESTRUCTOR:\n";
    std::cout << "    - 'virtual ~Question()' ensures derived class destructors are called\n";
    std::cout << "      when deleting objects via base class pointers.\n\n";
    std::cout << " 6. OPERATOR OVERLOADING:\n";
    std::cout << "    - Overloaded 'operator<<' for 'Question' and 'User' scorecards.\n\n";
    std::cout << " 7. EXCEPTION HANDLING:\n";
    std::cout << "    - Custom hierarchy: 'QuizException', 'FileNotFoundException',\n";
    std::cout << "      'InvalidFormatException' with try-catch blocks.\n\n";
    std::cout << " 8. FILE STREAMS & PERSISTENCE:\n";
    std::cout << "    - std::ifstream reads delimited question files.\n";
    std::cout << "    - std::ofstream appends student results to an audit log.\n";
    std::cout << "=================================================================\n";
}

int main() {
    const std::string questionsPath = "questions.txt";
    const std::string resultsPath = "results.txt";

    QuizManager manager;
    printHeader();

    try {
        manager.loadQuestions(questionsPath);
        std::cout << " [System] Loaded " << manager.getQuestionCount()
                  << " questions from '" << questionsPath << "'.\n";
    } catch (const QuizException& ex) {
        std::cerr << " [Initialization Warning] " << ex.what() << "\n";
    }

    bool running = true;
    while (running) {
        printMenu();
        std::string choiceInput;
        std::getline(std::cin, choiceInput);

        int choice = 0;
        try { choice = std::stoi(choiceInput); } catch (...) { choice = 0; }

        switch (choice) {
            case 1: { // Start Quiz
                if (manager.getQuestionCount() == 0) {
                    std::cout << "\n [!] Question bank is empty. Please add questions first.\n";
                    break;
                }
                std::cout << "\n Enter Student Full Name: ";
                std::string name;
                std::getline(std::cin, name);
                if (name.empty()) name = "Student";

                std::cout << " Enter Student Roll / ID Number: ";
                std::string roll;
                std::getline(std::cin, roll);
                if (roll.empty()) roll = "N/A";

                manager.startQuiz(name, roll, resultsPath);
                break;
            }
            case 2: { // View All Questions
                manager.displayAllQuestions();
                break;
            }
            case 3: { // Add Question (Admin)
                manager.addQuestionInteractive(questionsPath);
                break;
            }
            case 4: { // View Scoreboard
                manager.displayLeaderboard(resultsPath);
                break;
            }
            case 5: { // OOP Concepts Guide
                printOOPConcepts();
                break;
            }
            case 6: { // Reload Questions
                try {
                    manager.loadQuestions(questionsPath);
                    std::cout << "\n [Success] Reloaded " << manager.getQuestionCount()
                              << " questions from '" << questionsPath << "'.\n";
                } catch (const QuizException& ex) {
                    std::cerr << "\n [Error] " << ex.what() << "\n";
                }
                break;
            }
            case 7: { // Exit
                std::cout << "\n Exiting Online Examination System. Thank you!\n";
                running = false;
                break;
            }
            default:
                std::cout << "\n [!] Invalid selection. Please enter a number between 1 and 7.\n";
                break;
        }
    }

    return 0;
}
