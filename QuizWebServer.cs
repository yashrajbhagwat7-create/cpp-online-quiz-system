/**
 * ============================================================================
 *           OBJECT-ORIENTED ONLINE EXAMINATION & QUIZ SYSTEM
 *                  .NET / C# CORE LOGIC & WEB SERVER
 * ============================================================================
 * Concepts : Data Abstraction, Inheritance, Dynamic Polymorphism,
 *            File Streams (questions.txt & results.txt), Self-Hosted HTTP Server,
 *            JSON Serialization, REST API.
 * Direct Port & Bridge of the C++ Single-File Quiz Architecture.
 * ============================================================================
 */

using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;

namespace OnlineQuizSystem
{
    // ============================================================================
    // 1. ABSTRACT BASE CLASS (Question)
    // Demonstrates: Data Abstraction, Pure Virtual/Abstract Methods, Encapsulation
    // Direct C# equivalence of C++ `class Question`
    // ============================================================================
    public abstract class Question
    {
        protected int id;
        protected string questionText;
        protected int points;

        public Question(int id, string text, int points)
        {
            this.id = id;
            this.questionText = text;
            this.points = points;
        }

        public int Id { get { return id; } }
        public string QuestionText { get { return questionText; } }
        public int Points { get { return points; } }

        // Abstract Methods (Pure Virtual in C++)
        public abstract bool CheckAnswer(string userAns);
        public abstract string GetTypeString();
        public abstract string GetCorrectAnswer();
        public abstract string Serialize();
        public abstract Dictionary<string, object> ToSafeDictionary();
        public abstract Dictionary<string, object> ToFullDictionary();

        public override string ToString()
        {
            return string.Format("[Q{0}] ({1} pts) {2}", id, points, questionText);
        }
    }

    // ============================================================================
    // 2. DERIVED QUESTION CLASSES (Inheritance & Polymorphism)
    // Direct C# equivalence of C++ derived classes
    // ============================================================================

    // Derived Class 1: Multiple Choice Question (MCQ)
    public class MCQQuestion : Question
    {
        private List<string> options;
        private char correctOption; // 'A', 'B', 'C', or 'D'

        public MCQQuestion(int id, string text, List<string> opts, char correctOpt, int pts)
            : base(id, text, pts)
        {
            this.options = opts ?? new List<string>();
            this.correctOption = char.ToUpper(correctOpt);
        }

        public List<string> Options { get { return options; } }
        public char CorrectOption { get { return correctOption; } }

        public override bool CheckAnswer(string userAns)
        {
            if (string.IsNullOrEmpty(userAns)) return false;
            string clean = userAns.Trim().ToUpper();

            // Match 'A', 'B', 'C', 'D'
            if (clean.Length == 1 && clean[0] == correctOption) return true;

            // Match full option text if candidate typed or sent option body
            int idx = correctOption - 'A';
            if (idx >= 0 && idx < options.Count)
            {
                if (clean.Equals(options[idx].Trim().ToUpper(), StringComparison.OrdinalIgnoreCase))
                    return true;
            }

            return false;
        }

        public override string GetTypeString() { return "MCQ"; }

        public override string GetCorrectAnswer()
        {
            int idx = correctOption - 'A';
            if (idx >= 0 && idx < options.Count)
                return string.Format("{0} ({1})", correctOption, options[idx]);
            return correctOption.ToString();
        }

        public override string Serialize()
        {
            StringBuilder sb = new StringBuilder();
            sb.Append("MCQ|").Append(questionText);
            foreach (var o in options) sb.Append("|").Append(o);
            sb.Append("|").Append(correctOption).Append("|").Append(points);
            return sb.ToString();
        }

        public override Dictionary<string, object> ToSafeDictionary()
        {
            var dict = new Dictionary<string, object>();
            dict["id"] = id;
            dict["type"] = "MCQ";
            dict["typeLabel"] = "Multiple Choice";
            dict["question"] = questionText;
            dict["points"] = points;
            dict["options"] = options;
            return dict;
        }

        public override Dictionary<string, object> ToFullDictionary()
        {
            var dict = ToSafeDictionary();
            dict["correctOption"] = correctOption.ToString();
            dict["correctAnswer"] = GetCorrectAnswer();
            return dict;
        }
    }

    // Derived Class 2: True / False Question
    public class TrueFalseQuestion : Question
    {
        private bool correctAnswer;

        public TrueFalseQuestion(int id, string text, bool correctAns, int pts)
            : base(id, text, pts)
        {
            this.correctAnswer = correctAns;
        }

        public bool CorrectAnswer { get { return correctAnswer; } }

        public override bool CheckAnswer(string userAns)
        {
            if (string.IsNullOrEmpty(userAns)) return false;
            string clean = userAns.Trim().ToUpper();
            if (clean == "T" || clean == "TRUE" || clean == "1") return correctAnswer == true;
            if (clean == "F" || clean == "FALSE" || clean == "0") return correctAnswer == false;
            return false;
        }

        public override string GetTypeString() { return "TF"; }
        public override string GetCorrectAnswer() { return correctAnswer ? "True" : "False"; }

        public override string Serialize()
        {
            return string.Format("TF|{0}|{1}|{2}", questionText, correctAnswer ? "True" : "False", points);
        }

        public override Dictionary<string, object> ToSafeDictionary()
        {
            var dict = new Dictionary<string, object>();
            dict["id"] = id;
            dict["type"] = "TF";
            dict["typeLabel"] = "True / False";
            dict["question"] = questionText;
            dict["points"] = points;
            dict["options"] = new List<string> { "True", "False" };
            return dict;
        }

        public override Dictionary<string, object> ToFullDictionary()
        {
            var dict = ToSafeDictionary();
            dict["correctAnswer"] = GetCorrectAnswer();
            return dict;
        }
    }

    // Derived Class 3: Fill in the Blanks Question
    public class FillInBlankQuestion : Question
    {
        private string expectedAnswer;

        public FillInBlankQuestion(int id, string text, string answer, int pts)
            : base(id, text, pts)
        {
            this.expectedAnswer = (answer ?? "").Trim();
        }

        public string ExpectedAnswer { get { return expectedAnswer; } }

        public override bool CheckAnswer(string userAns)
        {
            if (string.IsNullOrEmpty(userAns)) return false;
            return string.Equals(userAns.Trim(), expectedAnswer, StringComparison.OrdinalIgnoreCase);
        }

        public override string GetTypeString() { return "FIB"; }
        public override string GetCorrectAnswer() { return expectedAnswer; }

        public override string Serialize()
        {
            return string.Format("FIB|{0}|{1}|{2}", questionText, expectedAnswer, points);
        }

        public override Dictionary<string, object> ToSafeDictionary()
        {
            var dict = new Dictionary<string, object>();
            dict["id"] = id;
            dict["type"] = "FIB";
            dict["typeLabel"] = "Fill in the Blanks";
            dict["question"] = questionText;
            dict["points"] = points;
            return dict;
        }

        public override Dictionary<string, object> ToFullDictionary()
        {
            var dict = ToSafeDictionary();
            dict["correctAnswer"] = GetCorrectAnswer();
            return dict;
        }
    }

    // ============================================================================
    // 3. CANDIDATE / USER SCORECARD ENTITY
    // Demonstrates: Encapsulation, Performance Grading Logic
    // ============================================================================
    public class User
    {
        private string name;
        private string rollNo;
        private int score;
        private int maxScore;
        private int correctCount;
        private int totalQuestions;

        public User(string name = "Student", string roll = "N/A")
        {
            this.name = string.IsNullOrEmpty(name) ? "Student" : name.Trim();
            this.rollNo = string.IsNullOrEmpty(roll) ? "N/A" : roll.Trim();
            this.score = 0;
            this.maxScore = 0;
            this.correctCount = 0;
            this.totalQuestions = 0;
        }

        public string Name { get { return name; } }
        public string RollNo { get { return rollNo; } }
        public int Score { get { return score; } }
        public int MaxScore { get { return maxScore; } }
        public int CorrectCount { get { return correctCount; } }
        public int TotalQuestions { get { return totalQuestions; } }

        public void AddScore(int pts) { score += pts; }

        public void SetStats(int correct, int total, int totalMax)
        {
            this.correctCount = correct;
            this.totalQuestions = total;
            this.maxScore = totalMax;
        }

        public double Percentage
        {
            get { return (maxScore > 0) ? (score * 100.0 / maxScore) : 0.0; }
        }

        public string Grade
        {
            get
            {
                double p = Percentage;
                if (p >= 90.0) return "A+ (Outstanding)";
                if (p >= 80.0) return "A  (Excellent)";
                if (p >= 70.0) return "B  (Good)";
                if (p >= 60.0) return "C  (Satisfactory)";
                if (p >= 50.0) return "D  (Pass)";
                return "F  (Needs Improvement)";
            }
        }
    }

    // ============================================================================
    // 4. QUIZ CONTROLLER (QuizManager)
    // Demonstrates: Polymorphic Collection (List<Question>), File Streams
    // Direct parity with C++ QuizManager reading questions.txt and results.txt
    // ============================================================================
    public class QuizManager
    {
        private List<Question> questions = new List<Question>();
        private string questionsFile;
        private string resultsFile;
        private readonly object fileLock = new object();

        public QuizManager(string qFile = "questions.txt", string rFile = "results.txt")
        {
            this.questionsFile = qFile;
            this.resultsFile = rFile;
            EnsureDefaultQuestionsFile();
            LoadQuestions();
        }

        public List<Question> Questions { get { return questions; } }
        public string QuestionsFilePath { get { return questionsFile; } }
        public string ResultsFilePath { get { return resultsFile; } }

        public void EnsureDefaultQuestionsFile()
        {
            lock (fileLock)
            {
                if (File.Exists(questionsFile) && new FileInfo(questionsFile).Length > 10) return;

                string defaultContent =
                    "# C++ OOP Online Examination System - Question Repository\n" +
                    "# Format:\n" +
                    "#   MCQ: MCQ | Question | Option A | Option B | Option C | Option D | CorrectOption | Points\n" +
                    "#   TF:  TF  | Question | CorrectAnswer (True/False) | Points\n" +
                    "#   FIB: FIB | Question | ExpectedAnswer | Points\n\n" +
                    "MCQ|What is the typical size of an empty class object in C++?|1 byte|0 bytes|4 bytes|Undefined|A|2\n" +
                    "TF|A constructor in C++ can be declared as virtual.|False|1\n" +
                    "MCQ|Which OOP feature is resolved at runtime using a Virtual Method Table (vtable)?|Polymorphism|Encapsulation|Abstraction|Data Hiding|A|2\n" +
                    "FIB|The concept of binding data and functions into a single unit is called _____|encapsulation|2\n" +
                    "TF|Friend functions have access to private members of a class.|True|1\n" +
                    "MCQ|Which operator CANNOT be overloaded in C++?|:: (Scope Resolution)|+ (Addition)|[] (Subscript)|= (Assignment)|A|2\n" +
                    "FIB|A class containing at least one pure virtual function is called an _____ class|abstract|2\n" +
                    "TF|An abstract class can be directly instantiated.|False|1\n" +
                    "MCQ|What form of inheritance does C++ support that Java does NOT support natively?|Multiple Inheritance|Single Inheritance|Multilevel Inheritance|Hierarchical Inheritance|A|2\n" +
                    "FIB|The mechanism of deriving a class from an existing class is called _____|inheritance|2\n" +
                    "MCQ|What do you call a function that is not a member of a class but can access its private data?|friend function|virtual function|pure virtual function|do nothing function|A|2\n";

                File.WriteAllText(questionsFile, defaultContent, Encoding.UTF8);
            }
        }

        public void LoadQuestions()
        {
            lock (fileLock)
            {
                questions.Clear();
                if (!File.Exists(questionsFile)) EnsureDefaultQuestionsFile();

                string[] lines = File.ReadAllLines(questionsFile);
                foreach (string rawLine in lines)
                {
                    string line = rawLine.Trim();
                    if (string.IsNullOrEmpty(line) || line.StartsWith("#")) continue;

                    string[] parts = line.Split('|');
                    for (int i = 0; i < parts.Length; i++) parts[i] = parts[i].Trim();

                    if (parts.Length < 3) continue;
                    string type = parts[0].ToUpper();
                    int id = questions.Count + 1;

                    try
                    {
                        if (type == "MCQ" && parts.Length >= 8)
                        {
                            var opts = new List<string> { parts[2], parts[3], parts[4], parts[5] };
                            char cOpt = parts[6].Length > 0 ? parts[6][0] : 'A';
                            int pts = 1;
                            int.TryParse(parts[7], out pts);
                            questions.Add(new MCQQuestion(id, parts[1], opts, cOpt, pts <= 0 ? 1 : pts));
                        }
                        else if (type == "TF" && parts.Length >= 4)
                        {
                            string bStr = parts[2].ToUpper();
                            bool isTrue = (bStr == "TRUE" || bStr == "T" || bStr == "1");
                            int pts = 1;
                            int.TryParse(parts[3], out pts);
                            questions.Add(new TrueFalseQuestion(id, parts[1], isTrue, pts <= 0 ? 1 : pts));
                        }
                        else if (type == "FIB" && parts.Length >= 4)
                        {
                            int pts = 1;
                            int.TryParse(parts[3], out pts);
                            questions.Add(new FillInBlankQuestion(id, parts[1], parts[2], pts <= 0 ? 1 : pts));
                        }
                    }
                    catch
                    {
                        // Ignore malformed rows gracefully
                    }
                }
            }
        }

        public void AddQuestion(Question q)
        {
            lock (fileLock)
            {
                questions.Add(q);
                File.AppendAllText(questionsFile, "\n" + q.Serialize(), Encoding.UTF8);
            }
        }

        public void RecordResult(User student)
        {
            lock (fileLock)
            {
                string line = string.Format("{0}|{1}|{2}/{3}|{4:F1}%|{5}|{6}\n",
                    student.RollNo,
                    student.Name,
                    student.Score,
                    student.MaxScore,
                    student.Percentage,
                    student.Grade,
                    DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));

                File.AppendAllText(resultsFile, line, Encoding.UTF8);
            }
        }

        public List<Dictionary<string, object>> GetResults()
        {
            var list = new List<Dictionary<string, object>>();
            lock (fileLock)
            {
                if (!File.Exists(resultsFile)) return list;

                string[] lines = File.ReadAllLines(resultsFile);
                foreach (string rawLine in lines)
                {
                    string line = rawLine.Trim();
                    if (string.IsNullOrEmpty(line)) continue;

                    string[] parts = line.Split('|');
                    if (parts.Length >= 6)
                    {
                        var row = new Dictionary<string, object>();
                        row["rollNo"] = parts[0].Trim();
                        row["name"] = parts[1].Trim();
                        row["score"] = parts[2].Trim();
                        row["percentage"] = parts[3].Trim();
                        row["grade"] = parts[4].Trim();
                        row["timestamp"] = parts[5].Trim();
                        list.Add(row);
                    }
                }
            }
            // Sort newest first
            list.Reverse();
            return list;
        }
    }

    // ============================================================================
    // 5. EMBEDDED HTTP SERVER & REST API
    // Self-contained HTTP engine hosting the REST API and serving UI assets
    // ============================================================================
    public class QuizWebServer
    {
        private HttpListener listener;
        private QuizManager quizManager;
        private JavaScriptSerializer jsonSerializer;
        private string webRootPath;
        private int port;
        private bool isRunning;

        public QuizWebServer(QuizManager qm, int port = 5050, string webRoot = "web")
        {
            this.quizManager = qm;
            this.port = port;
            this.webRootPath = Path.GetFullPath(webRoot);
            this.jsonSerializer = new JavaScriptSerializer();
        }

        public void Start()
        {
            listener = new HttpListener();
            listener.Prefixes.Add(string.Format("http://localhost:{0}/", port));
            listener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", port));

            try
            {
                listener.Start();
                isRunning = true;
                Console.ForegroundColor = ConsoleColor.Green;
                Console.WriteLine("=================================================================");
                Console.WriteLine("  .NET ONLINE QUIZ SYSTEM - C++ LOGIC ENGINE ACTIVE");
                Console.WriteLine("=================================================================");
                Console.ResetColor();
                Console.WriteLine(" [Server] Listening on: http://localhost:{0}/", port);
                Console.WriteLine(" [Server] Static UI Path: {0}", webRootPath);
                Console.WriteLine(" [Server] Loaded Questions: {0}", quizManager.Questions.Count);
                Console.WriteLine(" [Server] Press Ctrl+C in this console to stop.");
                Console.WriteLine("-----------------------------------------------------------------");

                ThreadPool.QueueUserWorkItem(ListenLoop);
            }
            catch (Exception ex)
            {
                Console.ForegroundColor = ConsoleColor.Red;
                Console.WriteLine(" [Error] Failed to start HTTP server on port {0}: {1}", port, ex.Message);
                Console.ResetColor();
            }
        }

        private void ListenLoop(object state)
        {
            while (isRunning && listener.IsListening)
            {
                try
                {
                    var context = listener.GetContext();
                    ThreadPool.QueueUserWorkItem(ProcessRequest, context);
                }
                catch (HttpListenerException) { break; }
                catch (Exception ex)
                {
                    Console.WriteLine(" [!] Listener loop error: {0}", ex.Message);
                }
            }
        }

        private void ProcessRequest(object state)
        {
            HttpListenerContext context = (HttpListenerContext)state;
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            // CORS headers
            response.Headers.Add("Access-Control-Allow-Origin", "*");
            response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");

            if (request.HttpMethod == "OPTIONS")
            {
                response.StatusCode = 200;
                response.Close();
                return;
            }

            string rawUrl = request.Url.AbsolutePath;
            string method = request.HttpMethod.ToUpper();

            try
            {
                if (rawUrl.StartsWith("/api/"))
                {
                    HandleApi(context, rawUrl, method);
                }
                else
                {
                    ServeStaticFile(context, rawUrl);
                }
            }
            catch (Exception ex)
            {
                SendJson(response, 500, new Dictionary<string, object>
                {
                    { "error", true },
                    { "message", ex.Message }
                });
            }
        }

        private void HandleApi(HttpListenerContext context, string path, string method)
        {
            var request = context.Request;
            var response = context.Response;

            if (path == "/api/status" && method == "GET")
            {
                var status = new Dictionary<string, object>
                {
                    { "status", "online" },
                    { "name", "Online Quiz System (.NET Core Logic Engine)" },
                    { "cplusplusArchitecture", "C++17 Polymorphic VTable Equivalent" },
                    { "questionCount", quizManager.Questions.Count },
                    { "questionsFile", quizManager.QuestionsFilePath },
                    { "resultsFile", quizManager.ResultsFilePath },
                    { "serverTime", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") }
                };
                SendJson(response, 200, status);
                return;
            }

            if (path == "/api/questions" && method == "GET")
            {
                // Polymorphic safe serialization (Does NOT leak correct answers to client during test)
                var safeList = new List<Dictionary<string, object>>();
                foreach (var q in quizManager.Questions)
                {
                    safeList.Add(q.ToSafeDictionary());
                }
                SendJson(response, 200, new Dictionary<string, object>
                {
                    { "success", true },
                    { "total", safeList.Count },
                    { "questions", safeList }
                });
                return;
            }

            if (path == "/api/questions/all" && method == "GET")
            {
                // Full Question Bank for Admin view
                var fullList = new List<Dictionary<string, object>>();
                foreach (var q in quizManager.Questions)
                {
                    fullList.Add(q.ToFullDictionary());
                }
                SendJson(response, 200, new Dictionary<string, object>
                {
                    { "success", true },
                    { "total", fullList.Count },
                    { "questions", fullList }
                });
                return;
            }

            if (path == "/api/submit" && method == "POST")
            {
                string body = ReadBody(request);
                var submission = jsonSerializer.Deserialize<Dictionary<string, object>>(body);

                string studentName = submission.ContainsKey("name") ? Convert.ToString(submission["name"]) : "Student";
                string rollNo = submission.ContainsKey("rollNo") ? Convert.ToString(submission["rollNo"]) : "N/A";
                Dictionary<string, object> answers = null;

                if (submission.ContainsKey("answers") && submission["answers"] is Dictionary<string, object>)
                {
                    answers = (Dictionary<string, object>)submission["answers"];
                }
                else
                {
                    answers = new Dictionary<string, object>();
                }

                // Dynamic Polymorphic Evaluation
                User student = new User(studentName, rollNo);
                int totalMax = 0;
                int correctCount = 0;
                var reviewList = new List<Dictionary<string, object>>();

                foreach (Question q in quizManager.Questions)
                {
                    totalMax += q.Points;
                    string key = q.Id.ToString();
                    string userAns = answers.ContainsKey(key) ? Convert.ToString(answers[key]) : "";

                    // Runtime dynamic dispatch (exact mirror of q->checkAnswer(userAns))
                    bool isCorrect = q.CheckAnswer(userAns);
                    int earned = isCorrect ? q.Points : 0;
                    if (isCorrect)
                    {
                        student.AddScore(earned);
                        correctCount++;
                    }

                    var item = new Dictionary<string, object>();
                    item["id"] = q.Id;
                    item["type"] = q.GetTypeString();
                    item["question"] = q.QuestionText;
                    item["userAnswer"] = userAns;
                    item["correctAnswer"] = q.GetCorrectAnswer();
                    item["isCorrect"] = isCorrect;
                    item["pointsAwarded"] = earned;
                    item["maxPoints"] = q.Points;

                    // Extra hint/display text for MCQ
                    MCQQuestion mcq = q as MCQQuestion;
                    if (mcq != null && !string.IsNullOrEmpty(userAns) && userAns.Length == 1)
                    {
                        char c = char.ToUpper(userAns[0]);
                        int idx = c - 'A';
                        if (idx >= 0 && idx < mcq.Options.Count)
                        {
                            item["userAnswerText"] = string.Format("{0} ({1})", c, mcq.Options[idx]);
                        }
                    }

                    reviewList.Add(item);
                }

                student.SetStats(correctCount, quizManager.Questions.Count, totalMax);

                // Persist score to results.txt (identical to C++ file handling)
                quizManager.RecordResult(student);

                var responsePayload = new Dictionary<string, object>
                {
                    { "success", true },
                    { "name", student.Name },
                    { "rollNo", student.RollNo },
                    { "score", student.Score },
                    { "maxScore", student.MaxScore },
                    { "percentage", Math.Round(student.Percentage, 2) },
                    { "grade", student.Grade },
                    { "correctCount", student.CorrectCount },
                    { "totalQuestions", student.TotalQuestions },
                    { "passed", student.Percentage >= 50.0 },
                    { "timestamp", DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") },
                    { "review", reviewList }
                };

                SendJson(response, 200, responsePayload);
                return;
            }

            if (path == "/api/results" && method == "GET")
            {
                var results = quizManager.GetResults();
                SendJson(response, 200, new Dictionary<string, object>
                {
                    { "success", true },
                    { "count", results.Count },
                    { "results", results }
                });
                return;
            }

            if (path == "/api/questions/add" && method == "POST")
            {
                string body = ReadBody(request);
                var data = jsonSerializer.Deserialize<Dictionary<string, object>>(body);

                string type = Convert.ToString(data["type"]).ToUpper();
                string text = Convert.ToString(data["question"]);
                int pts = 1;
                if (data.ContainsKey("points")) int.TryParse(Convert.ToString(data["points"]), out pts);
                if (pts <= 0) pts = 1;

                int newId = quizManager.Questions.Count + 1;
                Question newQ = null;

                if (type == "MCQ")
                {
                    var rawOpts = (System.Collections.ArrayList)data["options"];
                    var opts = new List<string>();
                    foreach (var o in rawOpts) opts.Add(Convert.ToString(o));
                    string cStr = Convert.ToString(data["correctAnswer"]).Trim();
                    char cOpt = cStr.Length > 0 ? cStr[0] : 'A';
                    newQ = new MCQQuestion(newId, text, opts, cOpt, pts);
                }
                else if (type == "TF")
                {
                    string ansStr = Convert.ToString(data["correctAnswer"]).ToUpper();
                    bool bAns = (ansStr == "TRUE" || ansStr == "T" || ansStr == "1");
                    newQ = new TrueFalseQuestion(newId, text, bAns, pts);
                }
                else if (type == "FIB")
                {
                    string ansStr = Convert.ToString(data["correctAnswer"]).Trim();
                    newQ = new FillInBlankQuestion(newId, text, ansStr, pts);
                }

                if (newQ != null)
                {
                    quizManager.AddQuestion(newQ);
                    SendJson(response, 200, new Dictionary<string, object>
                    {
                        { "success", true },
                        { "message", "Question added successfully!" },
                        { "question", newQ.ToFullDictionary() }
                    });
                }
                else
                {
                    SendJson(response, 400, new Dictionary<string, object>
                    {
                        { "success", false },
                        { "message", "Unsupported question type." }
                    });
                }
                return;
            }

            if (path == "/api/reload" && method == "POST")
            {
                quizManager.LoadQuestions();
                SendJson(response, 200, new Dictionary<string, object>
                {
                    { "success", true },
                    { "message", "Questions reloaded from file." },
                    { "count", quizManager.Questions.Count }
                });
                return;
            }

            if (path == "/api/concepts" && method == "GET")
            {
                var concepts = new List<Dictionary<string, string>>
                {
                    new Dictionary<string, string>
                    {
                        { "concept", "Data Abstraction" },
                        { "cpp", "class Question { virtual bool checkAnswer(...) const = 0; };" },
                        { "csharp", "public abstract class Question { public abstract bool CheckAnswer(...); }" },
                        { "explanation", "Hides implementation details; forces all question types to implement their specific evaluation logic." }
                    },
                    new Dictionary<string, string>
                    {
                        { "concept", "Inheritance" },
                        { "cpp", "class MCQQuestion : public Question { ... };" },
                        { "csharp", "public class MCQQuestion : Question { ... }" },
                        { "explanation", "Hierarchical derivation where MCQ, True/False, and FillInBlank reuse base properties (id, text, points)." }
                    },
                    new Dictionary<string, string>
                    {
                        { "concept", "Dynamic Polymorphism" },
                        { "cpp", "vector<Question*> questions;\nq->checkAnswer(userAns); // VTable dispatch" },
                        { "csharp", "List<Question> questions;\nq.CheckAnswer(userAns); // Dynamic method dispatch" },
                        { "explanation", "Enables heterogeneous question processing at runtime without if-else type checks." }
                    },
                    new Dictionary<string, string>
                    {
                        { "concept", "Memory Management" },
                        { "cpp", "virtual ~Question() {} // Virtual destructor prevents memory leaks" },
                        { "csharp", "Managed by .NET CLR Garbage Collector (GC)" },
                        { "explanation", "Safe resource lifecycle management across polymorphic objects." }
                    },
                    new Dictionary<string, string>
                    {
                        { "concept", "File Stream Persistence" },
                        { "cpp", "ifstream fin(\"questions.txt\");\nofstream fout(\"results.txt\", ios::app);" },
                        { "csharp", "File.ReadAllLines(\"questions.txt\");\nFile.AppendAllText(\"results.txt\", ...);" },
                        { "explanation", "Direct disk synchronization of quiz repository and student score records." }
                    }
                };

                SendJson(response, 200, new Dictionary<string, object>
                {
                    { "success", true },
                    { "concepts", concepts }
                });
                return;
            }

            SendJson(response, 404, new Dictionary<string, object>
            {
                { "error", true },
                { "message", "API endpoint not found: " + path }
            });
        }

        private void ServeStaticFile(HttpListenerContext context, string rawUrl)
        {
            var response = context.Response;
            string cleanPath = rawUrl.TrimStart('/');
            if (string.IsNullOrEmpty(cleanPath) || cleanPath == "index.html") cleanPath = "index.html";

            // If requested directly e.g. /style.css, map to web/style.css
            string filePath = Path.Combine(webRootPath, cleanPath);
            if (!File.Exists(filePath))
            {
                // Try checking inside webRoot directory directly
                string fallback = Path.Combine(webRootPath, Path.GetFileName(cleanPath));
                if (File.Exists(fallback)) filePath = fallback;
            }

            if (File.Exists(filePath))
            {
                byte[] bytes = File.ReadAllBytes(filePath);
                string ext = Path.GetExtension(filePath).ToLower();
                string mime = "text/plain";
                if (ext == ".html") mime = "text/html; charset=utf-8";
                else if (ext == ".css") mime = "text/css; charset=utf-8";
                else if (ext == ".js") mime = "application/javascript; charset=utf-8";
                else if (ext == ".json") mime = "application/json; charset=utf-8";
                else if (ext == ".svg") mime = "image/svg+xml";
                else if (ext == ".png") mime = "image/png";
                else if (ext == ".ico") mime = "image/x-icon";

                response.ContentType = mime;
                response.ContentLength64 = bytes.Length;
                response.OutputStream.Write(bytes, 0, bytes.Length);
                response.OutputStream.Close();
                return;
            }

            // Fallback: If index.html is missing, render an informative emergency fallback
            if (cleanPath == "index.html")
            {
                byte[] fallbackHtml = Encoding.UTF8.GetBytes(GetEmergencyFallbackHtml());
                response.ContentType = "text/html; charset=utf-8";
                response.ContentLength64 = fallbackHtml.Length;
                response.OutputStream.Write(fallbackHtml, 0, fallbackHtml.Length);
                response.OutputStream.Close();
                return;
            }

            response.StatusCode = 404;
            response.Close();
        }

        private string ReadBody(HttpListenerRequest request)
        {
            using (var reader = new StreamReader(request.InputStream, request.ContentEncoding))
            {
                return reader.ReadToEnd();
            }
        }

        private void SendJson(HttpListenerResponse response, int statusCode, object data)
        {
            response.StatusCode = statusCode;
            response.ContentType = "application/json; charset=utf-8";
            string json = jsonSerializer.Serialize(data);
            byte[] bytes = Encoding.UTF8.GetBytes(json);
            response.ContentLength64 = bytes.Length;
            response.OutputStream.Write(bytes, 0, bytes.Length);
            response.OutputStream.Close();
        }

        private string GetEmergencyFallbackHtml()
        {
            return "<!DOCTYPE html><html><head><title>Online Quiz System (.NET)</title>" +
                   "<style>body{font-family:sans-serif;padding:40px;background:#0f172a;color:#f8fafc;text-align:center;}" +
                   ".card{max-width:600px;margin:auto;background:#1e293b;padding:30px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.5);}" +
                   "h1{color:#38bdf8;}a{color:#818cf8;}</style></head><body>" +
                   "<div class='card'><h1>Quiz System .NET Server Active</h1>" +
                   "<p>The .NET C# Backend is running smoothly, but the frontend folder <code>web/index.html</code> was not found.</p>" +
                   "<p>Check API endpoints: <a href='/api/status'>/api/status</a> | <a href='/api/questions'>/api/questions</a> | <a href='/api/results'>/api/results</a></p>" +
                   "</div></body></html>";
        }

        public void Stop()
        {
            isRunning = false;
            if (listener != null) listener.Stop();
        }
    }

    // ============================================================================
    // 6. PROGRAM ENTRY POINT
    // ============================================================================
    public class Program
    {
        public static void Main(string[] args)
        {
            int port = 5050;
            if (args.Length > 0) int.TryParse(args[0], out port);
            if (port <= 0) port = 5050;

            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string qFile = Path.Combine(baseDir, "questions.txt");
            string rFile = Path.Combine(baseDir, "results.txt");
            string webRoot = Path.Combine(baseDir, "web");

            QuizManager manager = new QuizManager(qFile, rFile);
            QuizWebServer server = new QuizWebServer(manager, port, webRoot);
            server.Start();

            // Keep main thread alive
            while (true)
            {
                Thread.Sleep(1000);
            }
        }
    }
}
