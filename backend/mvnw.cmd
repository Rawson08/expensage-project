@REM Licensed to the Apache Software Foundation (ASF) under one or more
@REM contributor license agreements.  See the NOTICE file distributed with
@REM this work for additional information regarding copyright ownership.
@REM The ASF licenses this file to You under the Apache License, Version 2.0
@REM (the "License"); you may not use this file except in compliance with
@REM the License.  You may obtain a copy of the License at
@REM
@REM     http://www.apache.org/licenses/LICENSE-2.0
@REM
@REM Unless required by applicable law or agreed to in writing, software
@REM distributed under the License is distributed on an "AS IS" BASIS,
@REM WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
@REM See the License for the specific language governing permissions and
@REM limitations under the License.

@REM -----------------------------------------------------------------------------
@REM Maven Wrapper startup script.
@REM
@REM Optional ENV vars
@REM -----------------
@REM   MAVEN_OPTS - parameters passed to the Java VM when running Maven
@REM     e.g. -Xms256m -Xmx512m
@REM   MAVEN_SKIP_RC - flag to disable loading of mavenrc_pre ($HOME/.mavenrc)
@REM     and mavenrc_post (etc/mavenrc) files.
@REM     e.g. MAVEN_SKIP_RC=true
@REM -----------------------------------------------------------------------------

@REM Begin all commands with '@' so that the command echo is suppressed.
@echo off
@REM set title of command window
title %0
@REM set command-line arguments into a single variable
set MAVEN_CMD_LINE_ARGS=%*
@REM To handle issue #11 where the script is exec'd in a path with spaces
@REM see https://github.com/takari/maven-wrapper/issues/11
set MAVEN_PROJECT_BDIR=%~dp0

@REM Find the project base directory relative to the script directory
@REM SCRIPT_DIR is the directory of the script being run
set SCRIPT_DIR=%MAVEN_PROJECT_BDIR%
@REM MAVEN_PROJECT_BDIR is the base directory of the Maven project
set MAVEN_PROJECT_BDIR=%SCRIPT_DIR%
:findBaseDirLoop
if exist "%MAVEN_PROJECT_BDIR%.mvn" goto baseDirFound
cd ..
set MAVEN_PROJECT_BDIR=%cd%
if "%MAVEN_PROJECT_BDIR%"=="%SCRIPT_DIR%" goto baseDirNotFound
goto findBaseDirLoop
:baseDirFound
if "%MAVEN_PROJECT_BDIR%"=="" set MAVEN_PROJECT_BDIR=%cd%
cd "%MAVEN_PROJECT_BDIR%"

:baseDirNotFound

@REM MAVEN_PROJECT_CP used to be MAVEN_PROJECT_BDIR, but is not used for anything else
set MAVEN_PROJECT_CP="%MAVEN_PROJECT_BDIR%\.mvn\wrapper\maven-wrapper.jar"
if exist "%MAVEN_PROJECT_BDIR%\.mvn\wrapper\maven-wrapper-override.properties" (
  set MAVEN_PROJECT_CP="%MAVEN_PROJECT_BDIR%\.mvn\wrapper\maven-wrapper-override.jar"
)

@REM Check for MAVEN_HOME, and potentially use it
if not "%MAVEN_HOME%" == "" goto checkJava

:checkMvnInPath
@REM Check if 'mvn.cmd' is in the PATH
for %%a in (mvn.cmd) do set MAVEN_CMD=%%~fa
if not "%MAVEN_CMD%" == "" goto checkJava

@REM Check if 'mvn.bat' is in the PATH
for %%a in (mvn.bat) do set MAVEN_CMD=%%~fa
if not "%MAVEN_CMD%" == "" goto checkJava

@REM Check if 'mvn' is in the PATH
for %%a in (mvn) do set MAVEN_CMD=%%~fa
if not "%MAVEN_CMD%" == "" goto checkJava

@REM Check if 'mvn.exe' is in the PATH
for %%a in (mvn.exe) do set MAVEN_CMD=%%~fa
if not "%MAVEN_CMD%" == "" goto checkJava

@REM No Maven found in PATH, will use the wrapper settings
goto checkJava

:checkJava
@REM Check for JAVA_HOME
if not "%JAVA_HOME%" == "" goto runMaven

@REM Check if 'java.exe' is in the PATH
for %%a in (java.exe) do set JAVA_CMD=%%~fa
if not "%JAVA_CMD%" == "" goto runMaven

@REM No Java found
echo Error: JAVA_HOME not found in your environment. >&2
echo Please set the JAVA_HOME variable in your environment to match the >&2
echo location of your Java installation. >&2
exit /b 1

:runMaven
@REM Execute Maven
"%JAVA_HOME%\bin\java.exe" %MAVEN_OPTS% -classpath %MAVEN_PROJECT_CP% "-Dmaven.home=%MAVEN_HOME%" "-Dmaven.multiModuleProjectDirectory=%MAVEN_PROJECT_BDIR%" org.apache.maven.wrapper.MavenWrapperMain %MAVEN_CMD_LINE_ARGS%

:end
if "%MAVEN_BATCH_ECHO%" == "on" echo %MAVEN_BATCH_COMMAND%
if "%OS%"=="Windows_NT" @endlocal
if "%MAVEN_BATCH_PAUSE%" == "on" pause

exit /b %ERRORLEVEL%