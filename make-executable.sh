#!/bin/bash

echo "🧬 MAKING BRANDGENIE x OMEGA SCRIPTS EXECUTABLE"
echo "=============================================="

# Make all shell scripts executable
chmod +x quick-start.sh
chmod +x deploy-forgepilot.sh

# Make Python scripts executable
chmod +x test-integration.py
chmod +x demo.py

echo "✅ All scripts are now executable!"
echo ""
echo "🚀 READY TO DEPLOY:"
echo "   ./quick-start.sh      - Complete deployment with health checks"
echo "   python3 demo.py       - Interactive brand generation demo" 
echo "   python3 test-integration.py - Comprehensive test suite"
echo ""
echo "🧬 The ForgePilot digital organism is ready to be born!"
