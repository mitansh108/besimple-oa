# BeSimple OA - AI Judge System Setup

## Overview
This system allows you to create AI judges with custom system prompts (like "You are a strict grammar critic") and run them on student submissions to automatically evaluate answers.

## Architecture
- **Frontend**: React + TypeScript + Vite + Firebase
- **Backend**: Firebase Cloud Functions
- **Database**: Firestore
- **LLM Providers**: OpenAI (GPT), Google Gemini, Groq (Llama/Mixtral)

## Setup Instructions

### 1. Install Firebase CLI
```bash
npm install -g firebase-tools
firebase login
```

### 2. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend (Functions):**
```bash
cd functions
npm install
cd ..
```

### 3. Configure API Keys

Create `functions/.env` file with your API keys:
```bash
# OpenAI API Key (for GPT models)
OPENAI_API_KEY=sk-...

# Google Gemini API Key (get from https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=...

# Groq API Key (get from https://console.groq.com)
GROQ_API_KEY=...
```

**Get API Keys:**
- **Gemini (Free)**: https://makersuite.google.com/app/apikey
- **Groq (Free)**: https://console.groq.com
- **OpenAI (Paid)**: https://platform.openai.com/api-keys

### 4. Deploy Firebase Functions

```bash
# Build functions
cd functions
npm run build
cd ..

# Deploy to Firebase
firebase deploy --only functions

# Or deploy everything (functions + firestore rules + hosting)
firebase deploy
```

### 5. Set Environment Variables in Firebase

```bash
firebase functions:config:set \
  openai.key="YOUR_OPENAI_KEY" \
  gemini.key="YOUR_GEMINI_KEY" \
  groq.key="YOUR_GROQ_KEY"

# Redeploy after setting config
firebase deploy --only functions
```

### 6. Run Frontend

```bash
npm run dev
```

## How to Use

### 1. Create Judges
- Go to **Judges** page
- Click "Create Judge"
- Enter a name (e.g., "Grammar Critic")
- Select a model (e.g., "Gemini 1.5 Flash")
- Write your custom system prompt:
  ```
  You are a strict grammar critic. Fail the submission if there are any typos or grammatical errors. If it is perfect, pass it.
  ```
- Save the judge

### 2. Upload Submissions
- Go to **Submissions** page
- Drag & drop or upload your `test_input.json` file
- The file should contain an array of submissions with questions and answers

### 3. Assign Judges to Questions
- Go to **Assignments** page
- Select a queue
- For each question, select which judges should evaluate it
- Click "Save Assignments"

### 4. Run Evaluations
- Go to **Submissions** page
- Select submissions (or leave empty to run on all)
- Click "Run AI Judges"
- Wait for the evaluation to complete

### 5. View Results
- Go to **Results** page
- See all evaluations with PASS/FAIL verdicts
- Expand each submission to see detailed judge reasoning

## File Structure

```
├── src/
│   ├── pages/
│   │   ├── Judges.tsx          # Create/manage AI judges
│   │   ├── Submissions.tsx     # Upload & view submissions
│   │   ├── Assignments.tsx     # Assign judges to questions
│   │   └── Results.tsx         # View evaluation results
│   ├── services/
│   │   └── judgeRunner.ts      # Call Firebase function
│   ├── firebase.ts             # Firebase config
│   └── types.ts                # TypeScript types
├── functions/
│   └── src/
│       ├── index.ts            # Main Cloud Function
│       └── llm/
│           ├── router.ts       # Route to correct provider
│           ├── openai.ts       # OpenAI integration
│           ├── gemini.ts       # Google Gemini integration
│           └── groq.ts         # Groq integration
├── firebase.json               # Firebase config
└── firestore.rules             # Database security rules
```

## Firestore Collections

- **judges**: AI judge configurations
- **submissions**: Student submissions with questions/answers
- **judgeAssignments**: Maps questions to judges
- **evaluations**: Evaluation results from judges

## Troubleshooting

### Functions not deploying
```bash
# Check Firebase project
firebase use --add

# Check functions logs
firebase functions:log
```

### API Key errors
- Make sure `.env` file is in `functions/` directory
- Verify API keys are valid
- Check Firebase Functions config: `firebase functions:config:get`

### CORS errors
- Functions are configured for CORS automatically
- Make sure you're calling from the same Firebase project

## Cost Considerations

- **Gemini 1.5 Flash**: Free tier (60 requests/minute)
- **Groq**: Free tier (ultra-fast inference)
- **OpenAI GPT**: Paid (check pricing at openai.com/pricing)

## Next Steps

- Add authentication
- Implement rate limiting
- Add batch processing for large submissions
- Export results to CSV
- Add more LLM providers (Anthropic Claude, etc.)
