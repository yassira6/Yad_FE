export const FLATTEN_RESTORE_SCRIPT_NAME = 'folders-for-flattened-names.cmd'

export const FLATTEN_RESTORE_SCRIPT = String.raw`@echo off
setlocal EnableDelayedExpansion

rem ============================================================
rem  Folders for flattened names
rem
rem  "Download all files" in Yad File Explorer saves each file with
rem  its path flattened into the name, using "__" in place of "/"
rem  (e.g. src__components__FileExplorer.tsx really means
rem  src/components/FileExplorer.tsx). Browsers can't create real
rem  subfolders from a scripted download, so this is the workaround.
rem
rem  This script undoes that: it looks at every file in the CURRENT
rem  folder whose name contains "__", recreates the folder structure
rem  those "__" represent, and moves each file into place under its
rem  original name.
rem
rem  HOW TO USE
rem    1. Put this .cmd file in the same folder as the downloaded
rem       files (the one you picked in the browser's save dialog).
rem    2. Double-click it, or open Command Prompt in that folder and
rem       run: folders-for-flattened-names.cmd
rem    3. It prints each file as it's moved, then waits for a
rem       keypress so you can review the results.
rem
rem  CAVEATS
rem    - If two files would land in the same place, the later one
rem      overwrites the earlier one (move /Y).
rem    - If a downloaded file's real name legitimately contains "__"
rem      (rare), this script can't tell that apart from a folder
rem      separator and may move it somewhere unexpected — check the
rem      printed list below if a result looks wrong.
rem    - Prefer "Save to folder" instead when your browser supports
rem      it (Chrome, Edge, Brave) — it writes real folders directly
rem      and needs no script like this one.
rem ============================================================

echo Reconstructing folders from flattened filenames...
echo Working folder: %cd%
echo.

set count=0

for %%F in (*__*) do (
    set "flat=%%~nxF"
    set "rel=!flat:__=\!"

    set "destdir="
    for %%D in ("!rel!") do set "destdir=%%~dpD"

    if defined destdir (
        if not exist "!destdir!" mkdir "!destdir!"
    )

    if /I not "%%F"=="!rel!" (
        move /Y "%%F" "!rel!" >nul
        echo   %%F  --^>  !rel!
        set /a count+=1
    )
)

echo.
echo Done. Moved %count% file(s) into their original folders.
echo Files without "__" in the name were already at the top level and were left alone.
echo.
pause
`
