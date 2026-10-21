@echo off
title QuizMaster .NET - Online Examination Web Server
color 0b
echo =================================================================
echo        QUIZMASTER .NET - ONLINE EXAMINATION SYSTEM
echo              (C++ OOP Logic Engine in .NET C#)
echo =================================================================
echo.

:: Locate Microsoft C# Compiler (csc.exe)
set CSC="C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"

if not exist %CSC% (
    set CSC="C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe"
)

if not exist %CSC% (
    echo [ERROR] Microsoft .NET Framework C# Compiler (csc.exe) not found.
    echo Please ensure .NET Framework 4.5+ is enabled in Windows Features.
    pause
    exit /b 1
)

:: Compile if QuizWebServer.exe does not exist or source modified
echo [1/3] Compiling .NET Web Server with csc.exe...
%CSC% /nologo /r:System.Web.Extensions.dll /r:System.dll /r:System.Core.dll /out:QuizWebServer.exe QuizWebServer.cs

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Compilation failed!
    pause
    exit /b 1
)

echo [2/3] Build Successful: QuizWebServer.exe generated.
echo.
echo [3/3] Launching Web Application in default browser...
start http://localhost:5050/

echo.
echo =================================================================
echo  Server is running on: http://localhost:5050/
echo  Press Ctrl+C in this console window to shut down the server.
echo =================================================================
echo.

QuizWebServer.exe 5050
