@echo off
echo ===================================================
echo   Compiling Single-File C++ Quiz System
echo ===================================================

g++ -std=c++17 -Wall -Wextra quiz_system.cpp -o quiz_system.exe

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [SUCCESS] Compiled to quiz_system.exe
    echo Running quiz_system.exe...
    echo.
    quiz_system.exe
) else (
    echo.
    echo [FAILED] Compilation errors detected.
    pause
)
