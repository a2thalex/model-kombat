#!/bin/bash

# GitHub Repository Setup Script for Model Kombat

echo "Model Kombat - GitHub Setup"
echo "==========================="
echo ""
echo "Please follow these steps:"
echo ""
echo "1. First, create a new repository on GitHub:"
echo "   - Go to: https://github.com/new"
echo "   - Name: model-kombat (or your preferred name)"
echo "   - Description: A transparent, multi-phase AI model competition platform"
echo "   - Keep it public or private as you prefer"
echo "   - DO NOT initialize with README, .gitignore, or license"
echo ""
echo "2. After creating, copy your repository URL"
echo "   It will look like: https://github.com/YOUR_USERNAME/model-kombat.git"
echo ""
read -p "Enter your GitHub repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "Error: Repository URL cannot be empty"
    exit 1
fi

echo ""
echo "Adding remote origin..."
git remote add origin "$REPO_URL"

echo "Pushing to GitHub..."
git push -u origin master

echo ""
echo "✅ Done! Your code is now on GitHub."
echo ""
echo "Next steps:"
echo "1. Set up Firebase project at https://console.firebase.google.com"
echo "2. Copy Firebase config to .env file (use .env.example as template)"
echo "3. Run 'npm run dev' to start the development server"
echo ""
echo "Happy coding! 🚀"