#!/bin/bash

# Ensure we're in the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT" || exit 1

echo "--- Santaa Bot Startup Script ---"

# Check if node_modules directory exists, if not, run npm install
if [ ! -d "node_modules" ]; then
  echo "--- Installing required dependencies... ---"
  npm install || { echo "Error: npm install failed"; exit 1; }
fi

# Determine if we should start in dev mode
if [ "$1" == "dev" ] || [ "$1" == "--dev" ]; then
  echo "--- Starting Discord Bot in DEV mode... ---"
  npm run dev
else
  echo "--- Starting Discord Bot... ---"
  npm start
fi