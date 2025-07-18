@echo off
setlocal EnableDelayedExpansion

echo ========================================
echo Logan Security Dashboard Installation
echo ========================================
echo.

REM Colors (sort of) for Windows
set "INFO=[INFO]"
set "SUCCESS=[SUCCESS]"
set "WARNING=[WARNING]"
set "ERROR=[ERROR]"

echo %INFO% Checking prerequisites...

REM Check Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Node.js is required but not installed.
    echo %ERROR% Please install Node.js 18+ from https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo %SUCCESS% Node.js found: !NODE_VERSION!
)

REM Check npm
npm --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% npm is required but not installed.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo %SUCCESS% npm found: !NPM_VERSION!
)

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% Python is required but not installed.
    echo %ERROR% Please install Python 3.8+ from https://python.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
    echo %SUCCESS% Python found: !PYTHON_VERSION!
)

REM Check pip
pip --version >nul 2>&1
if errorlevel 1 (
    echo %ERROR% pip is required but not installed.
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('pip --version') do set PIP_VERSION=%%i
    echo %SUCCESS% pip found: !PIP_VERSION!
)

REM Check OCI CLI (optional)
oci --version >nul 2>&1
if errorlevel 1 (
    echo %WARNING% OCI CLI not found. You'll need to install and configure it.
    echo %WARNING% Installation guide: https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm
) else (
    for /f "tokens=*" %%i in ('oci --version') do set OCI_VERSION=%%i
    echo %SUCCESS% OCI CLI found: !OCI_VERSION!
)

echo.
echo %SUCCESS% Prerequisites check completed!
echo.

REM Install Node.js dependencies
echo %INFO% Installing Node.js dependencies...
npm install
if errorlevel 1 (
    echo %ERROR% Failed to install Node.js dependencies
    pause
    exit /b 1
)
echo %SUCCESS% Node.js dependencies installed successfully
echo.

REM Install Python dependencies
echo %INFO% Installing Python dependencies...
if exist "scripts\requirements.txt" (
    pip install -r scripts\requirements.txt
    if errorlevel 1 (
        echo %ERROR% Failed to install Python dependencies
        pause
        exit /b 1
    )
    echo %SUCCESS% Python dependencies installed successfully
) else (
    echo %WARNING% scripts\requirements.txt not found, skipping Python dependencies
)
echo.

REM Copy environment file
echo %INFO% Setting up configuration...
if not exist .env.local (
    if exist .env.local.example (
        copy .env.local.example .env.local >nul
        echo %SUCCESS% Created .env.local from template
        echo %WARNING% Please edit .env.local with your OCI configuration:
        echo %WARNING%   - NEXT_PUBLIC_LOGAN_REGION
        echo %WARNING%   - NEXT_PUBLIC_LOGAN_NAMESPACE
        echo %WARNING%   - NEXT_PUBLIC_LOGAN_COMPARTMENT_ID
        echo %WARNING%   - LOGAN_MCP_SERVER_PATH
    ) else (
        echo %ERROR% .env.local.example not found
        pause
        exit /b 1
    )
) else (
    echo %WARNING% .env.local already exists, skipping configuration copy
)
echo.

REM Create start scripts
echo %INFO% Creating startup scripts...

REM Create start-dashboard.bat
echo @echo off > start-dashboard.bat
echo echo Starting Logan Security Dashboard... >> start-dashboard.bat
echo. >> start-dashboard.bat
echo if not exist .env.local ( >> start-dashboard.bat
echo     echo ERROR: .env.local not found. Please copy .env.local.example and configure it. >> start-dashboard.bat
echo     pause >> start-dashboard.bat
echo     exit /b 1 >> start-dashboard.bat
echo ^) >> start-dashboard.bat
echo. >> start-dashboard.bat
echo echo Starting Next.js development server... >> start-dashboard.bat
echo npm run dev >> start-dashboard.bat
echo pause >> start-dashboard.bat

echo %SUCCESS% Created start-dashboard.bat

REM Create start-production.bat
echo @echo off > start-production.bat
echo echo Starting Logan Security Dashboard in production mode... >> start-production.bat
echo. >> start-production.bat
echo if not exist .env.local ( >> start-production.bat
echo     echo ERROR: .env.local not found. Please copy .env.local.example and configure it. >> start-production.bat
echo     pause >> start-production.bat
echo     exit /b 1 >> start-production.bat
echo ^) >> start-production.bat
echo. >> start-production.bat
echo echo Building application... >> start-production.bat
echo npm run build >> start-production.bat
echo if errorlevel 1 ( >> start-production.bat
echo     echo ERROR: Build failed >> start-production.bat
echo     pause >> start-production.bat
echo     exit /b 1 >> start-production.bat
echo ^) >> start-production.bat
echo. >> start-production.bat
echo echo Starting production server... >> start-production.bat
echo npm run start >> start-production.bat
echo pause >> start-production.bat

echo %SUCCESS% Created start-production.bat
echo.

echo %SUCCESS% Installation completed successfully!
echo.
echo %INFO% Next steps:
echo 1. Edit .env.local with your OCI configuration
echo 2. Ensure OCI CLI is configured: oci setup config
echo 3. Start the MCP server (see README.md for details)
echo 4. Start the dashboard: start-dashboard.bat
echo.
echo %INFO% For detailed instructions, see README.md
echo For production deployment, use: start-production.bat
echo.
pause
