#include <iostream>
#include <vector>
#include <string>
#include <fstream>
#include <sstream>

using namespace std;

// =======================================================
// 1. ABSTRACT BASE CLASS (Data Abstraction & Encapsulation)
// =======================================================
class Question {
protected:
    string text;
    int points;

public:
    Question(string t, int p) : text(t), points(p) {}
    virtual ~Question() {} // Virtual destructor for safe cleanup

    int getPoints() const { return points; }

    // Pure Virtual Functions (Enforces dynamic polymorphism)
    virtual void display() const = 0;
    virtual bool isCorrect(string ans) const = 0;
};

// =======================================================
// 2. DERIVED CLASS: MCQ (Inheritance & Polymorphism)
// =======================================================
class MCQ : public Question {
    string optA, optB, optC, optD;
    char correct;

public:
    MCQ(string t, string a, string b, string c, string d, char ans, int p)
        : Question(t, p), optA(a), optB(b), optC(c), optD(d), correct(toupper(ans)) {}

    void display() const override {
        cout << "\n[MCQ (" << points << " pts)] " << text << "\n"
             << "  A) " << optA << "\n"
             << "  B) " << optB << "\n"
             << "  C) " << optC << "\n"
             << "  D) " << optD << "\n"
             << "Your Answer (A/B/C/D): ";
    }

    bool isCorrect(string ans) const override {
        return !ans.empty() && toupper(ans[0]) == correct;
    }
};

// =======================================================
// 3. DERIVED CLASS: True/False (Hierarchical Inheritance)
// =======================================================
class TrueFalse : public Question {
    char correct; // 'T' or 'F'

public:
    TrueFalse(string t, char ans, int p)
        : Question(t, p), correct(toupper(ans)) {}

    void display() const override {
        cout << "\n[True/False (" << points << " pts)] " << text << "\n"
             << "Your Answer (T/F): ";
    }

    bool isCorrect(string ans) const override {
        return !ans.empty() && toupper(ans[0]) == correct;
    }
};

// =======================================================
// 4. MAIN PROGRAM & FILE HANDLING
// =======================================================
int main() {
    vector<Question*> questions; // Heterogeneous collection (Polymorphism)
    string filename = "questions.txt";

    // Step 1: Read Questions from File
    ifstream fin(filename);
    if (!fin) {
        cout << "Error: Could not open " << filename << endl;
        return 1;
    }

    string line;
    while (getline(fin, line)) {
        if (line.empty() || line[0] == '#') continue;

        stringstream ss(line);
        string type, qtext, pStr;
        getline(ss, type, '|');

        if (type == "MCQ") {
            string a, b, c, d, ans;
            getline(ss, qtext, '|');
            getline(ss, a, '|'); getline(ss, b, '|');
            getline(ss, c, '|'); getline(ss, d, '|');
            getline(ss, ans, '|'); getline(ss, pStr, '|');
            questions.push_back(new MCQ(qtext, a, b, c, d, ans[0], stoi(pStr)));
        } 
        else if (type == "TF") {
            string ans;
            getline(ss, qtext, '|');
            getline(ss, ans, '|'); getline(ss, pStr, '|');
            questions.push_back(new TrueFalse(qtext, ans[0], stoi(pStr)));
        }
    }
    fin.close();

    // Step 2: Student Details
    string name, roll;
    cout << "=== ONLINE QUIZ SYSTEM ===\nEnter Student Name: ";
    getline(cin, name);
    cout << "Enter Roll Number: ";
    getline(cin, roll);

    // Step 3: Conduct Quiz (Runtime Polymorphism in action)
    int totalScore = 0, maxScore = 0;
    for (Question* q : questions) {
        maxScore += q->getPoints();
        q->display(); // Dynamically calls MCQ::display() or TrueFalse::display()

        string userAns;
        getline(cin, userAns);

        if (q->isCorrect(userAns)) {
            cout << "Correct! +" << q->getPoints() << " points.\n";
            totalScore += q->getPoints();
        } else {
            cout << "Wrong answer!\n";
        }
    }

    // Step 4: Display & Save Result
    cout << "\n--------------------------\n";
    cout << "Candidate : " << name << " (" << roll << ")\n";
    cout << "Score     : " << totalScore << " / " << maxScore << "\n";
    cout << "Percentage: " << (maxScore > 0 ? (totalScore * 100.0 / maxScore) : 0) << "%\n";
    cout << "--------------------------\n";

    ofstream fout("results.txt", ios::app);
    if (fout) {
        fout << roll << "," << name << "," << totalScore << "/" << maxScore << "\n";
        fout.close();
        cout << "Result saved to results.txt\n";
    }

    // Step 5: Clean Up Memory
    for (Question* q : questions) {
        delete q;
    }
    return 0;
}
