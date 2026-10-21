/**
 * ============================================================================
 *           OBJECT-ORIENTED PROGRAMMING (C++) LAB MINI PROJECT
 *                  ONLINE EXAMINATION & QUIZ SYSTEM
 * ============================================================================
 * Title    : File-Driven Online Examination System (C++17)
 * Concepts : Abstraction, Encapsulation, Inheritance, Dynamic Polymorphism,
 *            Virtual Destructors, Operator Overloading, Exceptions, File Streams.
 * ============================================================================
 */

#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>
#include <iomanip>
#include <cctype>
#include <ctime>
#include <exception>

using namespace std;

// ============================================================================
// 1. HELPER STRING & TIME FUNCTIONS
// ============================================================================

string trim(const string& s) {
    int start = 0, end = (int)s.length() - 1;
    while (start <= end && isspace((unsigned char)s[start])) start++;
    while (end >= start && isspace((unsigned char)s[end])) end--;
    return (start <= end) ? s.substr(start, end - start + 1) : "";
}

string toUpper(string s) {
    for (char &c : s) c = toupper((unsigned char)c);
    return s;
}

string toLower(string s) {
    for (char &c : s) c = tolower((unsigned char)c);
    return s;
}

string getCurrentTime() {
    time_t now = time(nullptr);
    char buf[30];
    strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", localtime(&now));
    return string(buf);
}

// ============================================================================
// 2. EXCEPTION HANDLING HIERARCHY
// ============================================================================

class QuizException : public exception {
    string msg;
public:
    QuizException(string m) : msg(m) {}
    const char* what() const noexcept override { return msg.c_str(); }
};

// ============================================================================
// 3. ABSTRACT BASE CLASS (Question)
// Demonstrates: Data Abstraction, Pure Virtual Functions, Virtual Destructor
// ============================================================================

class Question {
protected:
    int id;
    string questionText;
    int points;

public:
    Question(int id, string text, int points)
        : id(id), questionText(text), points(points) {}
    virtual ~Question() {} // Virtual destructor for memory safety

    int getId() const { return id; }
    string getText() const { return questionText; }
    int getPoints() const { return points; }

    // Pure Virtual Functions (Dynamic Polymorphism Interface)
    virtual void display() const = 0;
    virtual bool checkAnswer(string userAns) const = 0;
    virtual string getType() const = 0;
    virtual string getCorrectAnswer() const = 0;
    virtual string serialize() const = 0;

    // Operator Overloading for stream output
    friend ostream& operator<<(ostream& os, const Question& q) {
        os << "[Q" << q.id << "] (" << q.points << " pts) " << q.questionText;
        return os;
    }
};

// ============================================================================
// 4. DERIVED QUESTION CLASSES (Inheritance & Polymorphism)
// ============================================================================

// Derived Class 1: Multiple Choice Question (MCQ)
class MCQQuestion : public Question {
    vector<string> options;
    char correctOption; // 'A', 'B', 'C', or 'D'

public:
    MCQQuestion(int id, string text, vector<string> opts, char correctOpt, int pts)
        : Question(id, text, pts), options(opts), correctOption(toupper(correctOpt)) {}

    void display() const override {
        cout << "\n============================================================\n"
             << " [Question " << id << "] (Multiple Choice | " << points << " Points)\n"
             << "------------------------------------------------------------\n"
             << " " << questionText << "\n\n";
        char optLabel = 'A';
        for (const string& opt : options) {
            cout << "   [" << optLabel++ << "] " << opt << "\n";
        }
        cout << "============================================================\n";
    }

    bool checkAnswer(string userAns) const override {
        string clean = toUpper(trim(userAns));
        return !clean.empty() && clean[0] == correctOption;
    }

    string getType() const override { return "Multiple Choice (MCQ)"; }

    string getCorrectAnswer() const override {
        string ans = "";
        ans += correctOption;
        int idx = correctOption - 'A';
        if (idx >= 0 && idx < (int)options.size()) ans += " (" + options[idx] + ")";
        return ans;
    }

    string serialize() const override {
        string line = "MCQ|" + questionText;
        for (const string& o : options) line += "|" + o;
        line += "|" + string(1, correctOption) + "|" + to_string(points);
        return line;
    }
};

// Derived Class 2: True / False Question
class TrueFalseQuestion : public Question {
    bool correctAnswer;

public:
    TrueFalseQuestion(int id, string text, bool correctAns, int pts)
        : Question(id, text, pts), correctAnswer(correctAns) {}

    void display() const override {
        cout << "\n============================================================\n"
             << " [Question " << id << "] (True / False | " << points << " Points)\n"
             << "------------------------------------------------------------\n"
             << " " << questionText << "\n\n"
             << "   Options: Enter [T] for True or [F] for False\n"
             << "============================================================\n";
    }

    bool checkAnswer(string userAns) const override {
        string clean = toUpper(trim(userAns));
        if (clean == "T" || clean == "TRUE" || clean == "1") return correctAnswer == true;
        if (clean == "F" || clean == "FALSE" || clean == "0") return correctAnswer == false;
        return false;
    }

    string getType() const override { return "True / False"; }
    string getCorrectAnswer() const override { return correctAnswer ? "True" : "False"; }

    string serialize() const override {
        return "TF|" + questionText + "|" + (correctAnswer ? "True" : "False") + "|" + to_string(points);
    }
};

// Derived Class 3: Fill in the Blanks Question
class FillInBlankQuestion : public Question {
    string expectedAnswer;

public:
    FillInBlankQuestion(int id, string text, string answer, int pts)
        : Question(id, text, pts), expectedAnswer(answer) {}

    void display() const override {
        cout << "\n============================================================\n"
             << " [Question " << id << "] (Fill in the Blanks | " << points << " Points)\n"
             << "------------------------------------------------------------\n"
             << " " << questionText << "\n\n"
             << "   Instruction: Type the missing word or phrase.\n"
             << "============================================================\n";
    }

    bool checkAnswer(string userAns) const override {
        return toLower(trim(userAns)) == toLower(trim(expectedAnswer));
    }

    string getType() const override { return "Fill in the Blanks"; }
    string getCorrectAnswer() const override { return expectedAnswer; }

    string serialize() const override {
        return "FIB|" + questionText + "|" + expectedAnswer + "|" + to_string(points);
    }
};

// ============================================================================
// 5. USER / CANDIDATE ENTITY & SCORECARD
// Demonstrates: Encapsulation, Operator Overloading (operator<<)
// ============================================================================

class User {
private:
    string name, rollNo;
    int score, maxScore, correctCount, totalQuestions;

public:
    User(string name = "Student", string roll = "N/A")
        : name(name), rollNo(roll), score(0), maxScore(0), correctCount(0), totalQuestions(0) {}

    string getName() const { return name; }
    string getRollNo() const { return rollNo; }
    int getScore() const { return score; }
    int getMaxScore() const { return maxScore; }

    void addScore(int pts) { score += pts; }
    void setStats(int correct, int total, int totalMax) {
        correctCount = correct;
        totalQuestions = total;
        maxScore = totalMax;
    }

    double getPercentage() const {
        return (maxScore > 0) ? (score * 100.0 / maxScore) : 0.0;
    }

    string getGrade() const {
        double p = getPercentage();
        if (p >= 90.0) return "A+ (Outstanding)";
        if (p >= 80.0) return "A  (Excellent)";
        if (p >= 70.0) return "B  (Good)";
        if (p >= 60.0) return "C  (Satisfactory)";
        if (p >= 50.0) return "D  (Pass)";
        return "F  (Needs Improvement)";
    }

    // Overloaded stream insertion operator for formatted ASCII scorecard
    friend ostream& operator<<(ostream& os, const User& u) {
        stringstream ss;
        ss << fixed << setprecision(2) << u.getPercentage() << "%";
        os << "\n+-------------------------------------------------------------+\n"
           << "|                     QUIZ SCORE CARD                         |\n"
           << "+-------------------------------------------------------------+\n"
           << "| Student Name      : " << left << setw(39) << u.name << " |\n"
           << "| Roll Number       : " << left << setw(39) << u.rollNo << " |\n"
           << "| Total Questions   : " << left << setw(39) << u.totalQuestions << " |\n"
           << "| Correct Answers   : " << left << setw(39) << u.correctCount << " |\n"
           << "| Final Score       : " << left << setw(39) << (to_string(u.score) + " / " + to_string(u.maxScore)) << " |\n"
           << "| Percentage        : " << left << setw(39) << ss.str() << " |\n"
           << "| Performance Grade : " << left << setw(39) << u.getGrade() << " |\n"
           << "+-------------------------------------------------------------+\n";
        return os;
    }
};

// ============================================================================
// 6. QUIZ CONTROLLER (QuizManager)
// Demonstrates: Polymorphic Vector, Dynamic Memory (new/delete), File Streams
// ============================================================================

class QuizManager {
private:
    vector<Question*> questions;

public:
    QuizManager() {}
    ~QuizManager() { clearQuestions(); }

    void clearQuestions() {
        for (Question* q : questions) delete q; // Calls derived virtual destructor
        questions.clear();
    }

    size_t getQuestionCount() const { return questions.size(); }

    // Creates default question bank if missing
    static void ensureDefaultQuestionsFile(const string& filePath) {
        ifstream check(filePath);
        if (check.is_open()) return;

        ofstream file(filePath);
        if (file.is_open()) {
            file << "# C++ OOP Quiz Repository (Delimited by |)\n"
                 << "MCQ|What is the typical size of an empty class in C++?|1 byte|0 bytes|4 bytes|Undefined|A|2\n"
                 << "TF|A constructor in C++ can be declared as virtual.|False|1\n"
                 << "MCQ|Which OOP feature is resolved at runtime using a vtable?|Polymorphism|Encapsulation|Abstraction|Data Hiding|A|2\n"
                 << "FIB|The concept of binding data and functions into a single unit is called _____|encapsulation|2\n"
                 << "TF|Friend functions can access private members of a class.|True|1\n"
                 << "MCQ|Which operator CANNOT be overloaded in C++?|:: (Scope Resolution)|+ (Addition)|[] (Subscript)|= (Assignment)|A|2\n"
                 << "FIB|A class containing at least one pure virtual function is called an _____ class|abstract|2\n"
                 << "TF|An abstract class can be directly instantiated.|False|1\n"
                 << "MCQ|What form of inheritance does C++ support that Java does NOT support natively?|Multiple Inheritance|Single Inheritance|Multilevel Inheritance|Hierarchical Inheritance|A|2\n"
                 << "FIB|The mechanism of deriving a class from an existing class is called _____|inheritance|2\n";
            file.close();
        }
    }

    // Loads questions from file
    void loadQuestions(const string& filePath) {
        clearQuestions();
        ensureDefaultQuestionsFile(filePath);

        ifstream file(filePath);
        if (!file.is_open()) throw QuizException("Could not open question file: " + filePath);

        string line;
        while (getline(file, line)) {
            line = trim(line);
            if (line.empty() || line[0] == '#') continue;

            stringstream ss(line);
            string token;
            vector<string> tokens;
            while (getline(ss, token, '|')) tokens.push_back(trim(token));

            if (tokens.empty()) continue;
            string type = toUpper(tokens[0]);
            int id = (int)questions.size() + 1;

            if (type == "MCQ" && tokens.size() >= 8) {
                vector<string> opts = {tokens[2], tokens[3], tokens[4], tokens[5]};
                char correctOpt = tokens[6].empty() ? 'A' : tokens[6][0];
                int pts = 1;
                try { pts = stoi(tokens[7]); } catch (...) { pts = 1; }
                questions.push_back(new MCQQuestion(id, tokens[1], opts, correctOpt, pts));
            } else if (type == "TF" && tokens.size() >= 4) {
                string bStr = toUpper(tokens[2]);
                bool isTrue = (bStr == "TRUE" || bStr == "T" || bStr == "1");
                int pts = 1;
                try { pts = stoi(tokens[3]); } catch (...) { pts = 1; }
                questions.push_back(new TrueFalseQuestion(id, tokens[1], isTrue, pts));
            } else if (type == "FIB" && tokens.size() >= 4) {
                int pts = 1;
                try { pts = stoi(tokens[3]); } catch (...) { pts = 1; }
                questions.push_back(new FillInBlankQuestion(id, tokens[1], tokens[2], pts));
            }
        }
        file.close();
    }

    // Runs examination session
    void startQuiz(const string& studentName, const string& rollNo, const string& resultsFile) {
        if (questions.empty()) {
            cout << "\n [!] Question bank is empty!\n";
            return;
        }

        User student(studentName, rollNo);
        int totalMax = 0, correctCount = 0;
        for (Question* q : questions) totalMax += q->getPoints();

        cout << "\n============================================================\n"
             << "                 ONLINE EXAMINATION STARTED                 \n"
             << " Candidate : " << studentName << " (Roll: " << rollNo << ")\n"
             << " Questions : " << questions.size() << " | Total Points: " << totalMax << "\n"
             << "============================================================\n";

        for (Question* q : questions) {
            q->display(); // Polymorphic display via vtable

            cout << " Your Answer >> ";
            string userAns;
            getline(cin, userAns);

            if (q->checkAnswer(userAns)) { // Polymorphic answer check
                cout << " >> [CORRECT!] +" << q->getPoints() << " points.\n";
                student.addScore(q->getPoints());
                correctCount++;
            } else {
                cout << " >> [INCORRECT!] Correct answer was: " << q->getCorrectAnswer() << "\n";
            }
        }

        student.setStats(correctCount, (int)questions.size(), totalMax);
        cout << student; // Overloaded operator<< prints scorecard

        ofstream outFile(resultsFile, ios::app);
        if (outFile.is_open()) {
            outFile << student.getRollNo() << "|"
                    << student.getName() << "|"
                    << student.getScore() << "/" << student.getMaxScore() << "|"
                    << fixed << setprecision(1) << student.getPercentage() << "%|"
                    << student.getGrade() << "|"
                    << getCurrentTime() << "\n";
            outFile.close();
            cout << " [System] Result recorded successfully in: " << resultsFile << "\n";
        }
    }

    // Displays all questions in repository
    void displayAllQuestions() const {
        if (questions.empty()) {
            cout << "\n [!] Question bank is empty.\n";
            return;
        }
        cout << "\n============================================================\n"
             << "                  QUESTION BANK INVENTORY                   \n"
             << "============================================================\n";
        for (const Question* q : questions) {
            q->display();
            cout << " [Details] Type: " << q->getType() << " | Answer: " << q->getCorrectAnswer() << "\n";
        }
        cout << "============================================================\n";
    }

    // Admin interactive question authoring
    void addQuestionInteractive(const string& filePath) {
        cout << "\n============================================================\n"
             << "                     ADD NEW QUESTION                       \n"
             << "============================================================\n"
             << " Select Type (1: MCQ, 2: True/False, 3: Fill Blanks): ";
        string chStr; getline(cin, chStr);
        int choice = 1; try { choice = stoi(chStr); } catch (...) { choice = 1; }

        cout << " Enter Question Statement: ";
        string text; getline(cin, text);

        cout << " Enter Points for this question: ";
        string ptsStr; getline(cin, ptsStr);
        int points = 1; try { points = stoi(ptsStr); } catch (...) { points = 1; }

        Question* newQ = nullptr;
        int newId = (int)questions.size() + 1;

        if (choice == 1) {
            vector<string> opts(4);
            for (int i = 0; i < 4; ++i) {
                cout << " Enter Option [" << (char)('A' + i) << "]: ";
                getline(cin, opts[i]);
            }
            cout << " Enter Correct Option (A, B, C, or D): ";
            string optChar; getline(cin, optChar);
            char cOpt = optChar.empty() ? 'A' : toupper(optChar[0]);
            newQ = new MCQQuestion(newId, text, opts, cOpt, points);
        } else if (choice == 2) {
            cout << " Enter Correct Answer ([T]rue or [F]alse): ";
            string tfStr; getline(cin, tfStr);
            string clean = toUpper(trim(tfStr));
            bool isTrue = (clean == "T" || clean == "TRUE" || clean == "1");
            newQ = new TrueFalseQuestion(newId, text, isTrue, points);
        } else if (choice == 3) {
            cout << " Enter Expected Word/Phrase: ";
            string ans; getline(cin, ans);
            newQ = new FillInBlankQuestion(newId, text, ans, points);
        } else {
            cout << " [!] Invalid option.\n";
            return;
        }

        if (newQ != nullptr) {
            questions.push_back(newQ);
            ofstream out(filePath, ios::app);
            if (out.is_open()) {
                out << newQ->serialize() << "\n";
                out.close();
                cout << "\n [Success] Question added and saved to file successfully!\n";
            }
        }
    }

    // Displays historical results
    void displayLeaderboard(const string& resultsFile) const {
        ifstream inFile(resultsFile);
        if (!inFile.is_open()) {
            cout << "\n [Info] No examination attempts recorded yet.\n";
            return;
        }

        cout << "\n+------------------------------------------------------------------------------------------+\n"
             << "|                               EXAMINATION SCORE LOG                                      |\n"
             << "+------------+----------------------+-----------+------------+--------------------+--------+\n"
             << "| Roll No    | Student Name         | Score     | Percentage | Grade              | Time   |\n"
             << "+------------+----------------------+-----------+------------+--------------------+--------+\n";

        string line;
        bool hasRecords = false;
        while (getline(inFile, line)) {
            line = trim(line);
            if (line.empty()) continue;

            stringstream ss(line);
            string roll, name, score, pct, grade, timeStr;
            if (getline(ss, roll, '|') && getline(ss, name, '|') &&
                getline(ss, score, '|') && getline(ss, pct, '|') &&
                getline(ss, grade, '|') && getline(ss, timeStr, '|')) {
                hasRecords = true;
                cout << "| " << left << setw(10) << roll
                     << " | " << left << setw(20) << name
                     << " | " << left << setw(9)  << score
                     << " | " << left << setw(10) << pct
                     << " | " << left << setw(18) << grade
                     << " | " << timeStr << " |\n";
            }
        }
        if (!hasRecords) cout << "|                           No attempts recorded yet.                                      |\n";
        cout << "+------------+----------------------+-----------+------------+--------------------+--------+\n";
        inFile.close();
    }
};

// ============================================================================
// 7. MENU & CONCEPTS GUIDE
// ============================================================================

void printHeader() {
    cout << "\n=================================================================\n"
         << "        C++ OBJECT-ORIENTED ONLINE EXAMINATION SYSTEM            \n"
         << "                 [Simplified Academic Edition]                   \n"
         << "=================================================================\n";
}

void printMenu() {
    cout << "\n------------------------- MAIN MENU -----------------------------\n"
         << "  1. Start Quiz / Examination\n"
         << "  2. View Question Bank (All Questions)\n"
         << "  3. Add New Question (Admin Mode)\n"
         << "  4. View Scoreboard & Past Results\n"
         << "  5. OOP Concepts Demonstrated in this Project\n"
         << "  6. Reload Questions from File\n"
         << "  7. Exit\n"
         << "-----------------------------------------------------------------\n"
         << " Enter choice (1-7): ";
}

void printOOPConcepts() {
    cout << "\n=================================================================\n"
         << "           OBJECT-ORIENTED PROGRAMMING CONCEPTS MAPPING          \n"
         << "=================================================================\n"
         << " 1. ENCAPSULATION: Data members are protected/private in Question,\n"
         << "    User, and QuizManager classes with public getters and methods.\n\n"
         << " 2. ABSTRACTION: Base class 'Question' is abstract; contains pure\n"
         << "    virtual functions (display() = 0, checkAnswer() = 0, etc.).\n\n"
         << " 3. INHERITANCE: Hierarchical derivation where MCQQuestion,\n"
         << "    TrueFalseQuestion, and FillInBlankQuestion inherit from Question.\n\n"
         << " 4. DYNAMIC POLYMORPHISM: vector<Question*> holds base pointers.\n"
         << "    Dynamic dispatch (q->display()) resolves via vtable at runtime.\n\n"
         << " 5. VIRTUAL DESTRUCTOR: virtual ~Question() ensures derived class\n"
         << "    destructors execute properly, preventing memory leaks.\n\n"
         << " 6. OPERATOR OVERLOADING: friend operator<< overloads stream insertion\n"
         << "    for clean, formatted User score card display.\n\n"
         << " 7. EXCEPTION HANDLING: Custom QuizException hierarchy wrapped in\n"
         << "    try-catch blocks for robust file parsing and validation.\n\n"
         << " 8. FILE STREAMS: ifstream parses delimited questions from questions.txt;\n"
         << "    ofstream appends examination results to results.txt.\n"
         << "=================================================================\n";
}

// ============================================================================
// 8. MAIN EXECUTION FUNCTION
// ============================================================================

int main() {
    const string questionsPath = "questions.txt";
    const string resultsPath = "results.txt";

    QuizManager manager;
    printHeader();

    try {
        manager.loadQuestions(questionsPath);
        cout << " [System] Loaded " << manager.getQuestionCount()
             << " questions from '" << questionsPath << "'.\n";
    } catch (const exception& ex) {
        cout << " [Warning] " << ex.what() << "\n";
    }

    bool running = true;
    while (running) {
        printMenu();
        string choiceStr;
        getline(cin, choiceStr);

        int choice = 0;
        try { choice = stoi(choiceStr); } catch (...) { choice = 0; }

        switch (choice) {
            case 1: { // Start Quiz
                if (manager.getQuestionCount() == 0) {
                    cout << "\n [!] Question bank is empty. Please add questions first.\n";
                    break;
                }
                cout << "\n Enter Student Full Name: ";
                string name; getline(cin, name);
                if (name.empty()) name = "Student";

                cout << " Enter Student Roll / ID Number: ";
                string roll; getline(cin, roll);
                if (roll.empty()) roll = "N/A";

                manager.startQuiz(name, roll, resultsPath);
                break;
            }
            case 2: // View All Questions
                manager.displayAllQuestions();
                break;
            case 3: // Add New Question (Admin)
                manager.addQuestionInteractive(questionsPath);
                break;
            case 4: // View Scoreboard
                manager.displayLeaderboard(resultsPath);
                break;
            case 5: // OOP Concepts Guide
                printOOPConcepts();
                break;
            case 6: // Reload Questions
                try {
                    manager.loadQuestions(questionsPath);
                    cout << "\n [Success] Reloaded " << manager.getQuestionCount()
                         << " questions from '" << questionsPath << "'.\n";
                } catch (const exception& ex) {
                    cout << "\n [Error] " << ex.what() << "\n";
                }
                break;
            case 7: // Exit
                cout << "\n Exiting Online Examination System. Thank you!\n";
                running = false;
                break;
            default:
                cout << "\n [!] Invalid selection. Please enter a number between 1 and 7.\n";
                break;
        }
    }

    return 0;
}
