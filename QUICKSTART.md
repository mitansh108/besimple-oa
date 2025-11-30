# Quick Start - Gemini AI Setup

## Step 1: Get Gemini API Key (Free!)

1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key

## Step 2: Configure API Key

Edit `functions/.env` and add your key:
```
GEMINI_API_KEY=your_actual_key_here
```

## Step 3: Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd functions
npm install
cd ..
```

## Step 4: Test Locally (Optional)

```bash
# Start Firebase emulators
firebase emulators:start

# In another terminal, start frontend
npm run dev
```

## Step 5: Deploy to Firebase

```bash
# Login to Firebase
firebase login

# Deploy functions
cd functions
npm run build
cd ..
firebase deploy --only functions

# Deploy everything (functions + hosting + firestore rules)
firebase deploy
```

## Step 6: Set Environment Variables in Firebase

After deploying, set your API key in Firebase:

```bash
firebase functions:config:set gemini.key="YOUR_GEMINI_API_KEY"
firebase deploy --only functions
```

## Step 7: Use the App!

1. **Create a Judge**
   - Go to "Judges" tab
   - Click "Create Judge"
   - Name: "Grammar Critic"
   - Model: "Gemini 1.5 Flash (Fast)"
   - System Prompt:
     ```
     You are a strict grammar critic. Fail the submission if there are any typos or grammatical errors. If it is perfect, pass it.
     ```

2. **Upload Submissions**
   - Go to "Submissions" tab
   - Upload your `test_input.json` file

3. **Assign Judges**
   - Go to "Assignments" tab
   - Select your queue
   - Assign the "Grammar Critic" judge to questions

4. **Run Evaluation**
   - Go back to "Submissions" tab
   - Click "Run AI Judges"
   - Wait for results!

## Troubleshooting

### "GEMINI_API_KEY not configured" error
- Make sure you set the environment variable in Firebase:
  ```bash
  firebase functions:config:set gemini.key="YOUR_KEY"
  firebase deploy --only functions
  ```

### Functions not deploying
- Check you're in the right Firebase project:
  ```bash
  firebase use --add
  ```

### API quota exceeded
- Gemini free tier: 60 requests/minute
- Wait a minute or upgrade to paid tier

## What's Next?

Once Gemini is working, you can add other providers:
- OpenAI GPT (paid)
- Groq Llama/Mixtral (free, ultra-fast)

Just add their API keys to `functions/.env` and redeploy!
