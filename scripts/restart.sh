#!/bin/bash

echo "🛑 Stopping all Electron processes..."
pkill -9 Electron 2>/dev/null || true

echo "⏳ Waiting for processes to terminate..."
sleep 2

echo "🚀 Starting development server..."
npm run dev
