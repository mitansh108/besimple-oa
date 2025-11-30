#!/bin/bash

echo "🚀 Deploying BeSimple OA AI Judge System..."

# Build frontend
echo "📦 Building frontend..."
npm run build

# Build functions
echo "⚙️  Building Cloud Functions..."
cd functions
npm run build
cd ..

# Deploy to Firebase
echo "🔥 Deploying to Firebase..."
firebase deploy

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Set your API keys in functions/.env"
echo "2. Configure Firebase Functions environment:"
echo "   firebase functions:config:set openai.key=\"YOUR_KEY\" gemini.key=\"YOUR_KEY\" groq.key=\"YOUR_KEY\""
echo "3. Visit your app and start creating judges!"
