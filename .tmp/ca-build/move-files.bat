@echo off
echo Moving files from nested structure to root...

:: Move main config files
move "brand-genie-ai\package.json" "."
move "brand-genie-ai\package-lock.json" "."
move "brand-genie-ai\next.config.ts" "."
move "brand-genie-ai\tailwind.config.ts" "."
move "brand-genie-ai\tsconfig.json" "."
move "brand-genie-ai\components.json" "."
move "brand-genie-ai\eslint.config.mjs" "."
move "brand-genie-ai\postcss.config.mjs" "."
move "brand-genie-ai\.gitignore" "."
move "brand-genie-ai\README.md" "."

:: Move source directory
move "brand-genie-ai\src" "."

:: Remove empty nested folder
rmdir "brand-genie-ai" /s /q

echo Cleanup complete!