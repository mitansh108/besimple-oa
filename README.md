# Verdict - AI Judge Evaluation Platform

An intelligent submission evaluation platform powered by multiple AI models (Gemini & Groq) that automates the grading and assessment of test submissions using customizable AI judges.

## 🚀 Features

### Core Features

#### 1. **AI Judge Management**
- Create and manage multiple AI judges with custom evaluation criteria
- Support for multiple AI models:
  - **Gemini 2.5 Flash** (with image support)
  - **GPT OSS** (20B & 120B)
  - **Groq Compound**
  - **Llama 3.3 70B & Llama 4 Maverick**
  - **Moonshot Kimi K2**
  - **Qwen 3 32B**
- Customizable system prompts/rubrics for each judge
- Pre-built prompt templates for common evaluation types:
  - Mathematics Checker
  - Grammar Checker
  - Logic & Reasoning
  - Factual Accuracy
- Active/Inactive status control for judges

#### 2. **Submission Management**
- Bulk upload submissions via JSON file (drag & drop or browse)
- Real-time submission tracking and monitoring
- View detailed submission information including:
  - Questions and answers
  - Submission metadata (Queue ID, timestamps)
  - Answer reasoning
- Assign specific judges to specific questions
- Delete individual or multiple submissions

#### 3. **Evaluation System**
- Run AI judges on all submissions or selected submissions
- Real-time evaluation processing
- Three verdict types:
  - **PASS** - Answer meets criteria
  - **FAIL** - Answer doesn't meet criteria
  - **INCONCLUSIVE** - Unable to determine or out of scope
- Detailed reasoning for each verdict
- Judge assignment per question for targeted evaluation

#### 4. **Results & Analytics**
- Comprehensive results page with filtering options:
  - Filter by judge
  - Filter by question
  - Filter by verdict
- Expandable result rows for detailed information
- Overall pass rate calculation
- Delete individual or bulk evaluations
- Export-ready data structure

#### 5. **Dashboard Analytics**
- Real-time analytics and insights:
  - Total evaluations count
  - Overall pass rate percentage
  - Active judges count
  - Average evaluations per judge
- Visual charts and graphs:
  - Pass rate by judge (bar chart)
  - Verdict distribution (pie chart)
  - 7-day evaluation trends (area chart)
  - Top model performance (horizontal bar chart)
  - Top questions by volume
- Recent activity feed
- Color-coded verdict indicators

### 🎁 Bonus Features

#### **Image Upload Support for AI Judges**
- Upload images to questions for visual evaluation (Gemini models only)
- Drag & drop or browse image files
- Image preview with delete option
- Automatic storage in Firebase Storage
- Images are included in AI judge evaluation context

#### **Pre-composed Prompt Templates**
- Quick-start templates for common evaluation scenarios
- One-click application of proven rubrics
- Templates include:
  - **Maths Checker**: Evaluates mathematical calculations and problem-solving
  - **Grammar Checker**: Assesses grammar, spelling, and writing quality
  - **Logic & Reasoning**: Analyzes argument structure and critical thinking
  - **Factual Accuracy**: Verifies truthfulness of factual claims

#### **AI Prompt Refinement**
- Built-in AI-powered prompt improvement tool
- Automatically enhances your judge prompts for better clarity and effectiveness
- One-click refinement with loading state
- Improves evaluation consistency and accuracy

#### **Interactive Dashboard**
- Beautiful, responsive analytics dashboard
- Real-time data visualization with Recharts
- Multiple chart types for comprehensive insights
- Color-coded metrics for quick understanding
- Trend analysis over time

## 🛠️ Tech Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Framer Motion** for animations
- **Recharts** for data visualization
- **Lucide React** for icons
- **React Router** for navigation

### Backend
- **Firebase Functions** (Node.js 24)
- **Firestore** for database
- **Firebase Storage** for image uploads
- **Firebase Admin SDK**

### AI Integration
- **Google Gemini API** (@google/genai)
- **Groq SDK** for additional models

## 📦 Installation

### Prerequisites
- Node.js 24 or higher
- Firebase CLI
- Firebase project with Firestore and Storage enabled

### Setup

1. **Clone the repository**
```bash
cd besimple-oa
```

2. **Install frontend dependencies**
```bash
npm install
```

3. **Install backend dependencies**
```bash
cd backend
npm install
cd ..
```

4. **Configure Firebase**
- Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
- Enable Firestore Database
- Enable Firebase Storage
- Enable Firebase Functions
- Copy your Firebase config to `src/firebase.ts`

5. **Set up environment variables**
Create `backend/.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
```

6. **Deploy Firebase Functions**
```bash
cd backend
npm run build
npm run deploy
cd ..
```

7. **Run the development server**
```bash
npm run dev
```

## 🎯 Usage

### Creating an AI Judge

1. Navigate to the **Judges** page
2. Click **"Create Judge"**
3. Fill in the judge details:
   - **Name**: Give your judge a descriptive name
   - **Model**: Select the AI model to use
   - **System Prompt**: Define the evaluation criteria (or use a template)
4. Optionally click **"Refine prompt with AI"** to improve your prompt
5. Click **"Create Judge"**

### Uploading Submissions

1. Navigate to the **Submissions** page
2. Drag & drop a JSON file or click **"Browse files"**
3. The JSON should follow this format:
```json
[
  {
    "id": "submission_1",
    "queueId": "queue_1",
    "labelingTaskId": "task_1",
    "createdAt": 1234567890,
    "questions": [
      {
        "data": {
          "id": "q1",
          "questionText": "What is 2+2?",
          "questionType": "multiple_choice"
        }
      }
    ],
    "answers": {
      "q1": {
        "choice": "4",
        "reasoning": "Basic arithmetic"
      }
    }
  }
]
```

### Adding Images to Questions (Bonus Feature)

1. Expand a submission in the **Submissions** page
2. Find the question you want to add an image to
3. Click **"Upload Image"** or drag & drop an image
4. The image will be uploaded and included in AI evaluations
5. Only Gemini models support image evaluation

### Assigning Judges to Questions

1. Expand a submission in the **Submissions** page
2. For each question, use the **"Assign Judges"** dropdown
3. Select one or more judges to evaluate that specific question
4. Assignments are saved automatically

### Running Evaluations

1. On the **Submissions** page, either:
   - Select specific submissions using checkboxes
   - Or leave all unselected to evaluate all submissions
2. Click **"Run AI Judges"**
3. Wait for the evaluation to complete
4. View results in the **Results** page

### Viewing Results

1. Navigate to the **Results** page
2. Use filters to narrow down results:
   - Filter by judge name
   - Filter by question
   - Filter by verdict (pass/fail/inconclusive)
3. Click on any row to expand and see detailed reasoning
4. View the overall pass rate at the top

### Analyzing Performance

1. Navigate to the **Dashboard** page
2. View comprehensive analytics:
   - Overall statistics cards
   - Pass rate by judge
   - Verdict distribution
   - 7-day trends
   - Model performance comparison
   - Top questions by volume
   - Recent activity feed

## 📁 Project Structure

```
besimple-oa/
├── src/
│   ├── components/       # Reusable UI components
│   ├── pages/           # Main application pages
│   │   ├── Dashboard.tsx    # Analytics dashboard
│   │   ├── Judges.tsx       # Judge management
│   │   ├── Submissions.tsx  # Submission management
│   │   ├── Results.tsx      # Evaluation results
│   │   └── Landing.tsx      # Landing page
│   ├── services/        # API services
│   │   └── judgeRunner.ts   # Judge execution & prompt refinement
│   ├── firebase.ts      # Firebase configuration
│   └── types.ts         # TypeScript type definitions
├── backend/
│   └── src/
│       └── index.ts     # Firebase Functions
├── public/
│   └── logos/          # AI model logos
└── firebase.json       # Firebase configuration
```

## 🔥 Firebase Collections

### `judges`
Stores AI judge configurations
```typescript
{
  name: string
  model: string
  systemPrompt: string
  isActive: boolean
}
```

### `submissions`
Stores test submissions
```typescript
{
  queueId: string
  labelingTaskId: string
  createdAt: number
  questions: Array<{
    id: string
    questionText: string
    questionType: string
    imageUrl?: string  // Bonus: Image support
  }>
  answers: Record<string, {
    choice: string
    reasoning: string
  }>
}
```

### `judgeAssignments`
Stores judge-to-question assignments
```typescript
{
  queueId: string
  questionId: string
  judgeIds: string[]
  updatedAt: number
}
```

### `evaluations`
Stores evaluation results
```typescript
{
  submissionId: string
  questionId: string
  questionText: string
  answer: string
  answerReasoning: string
  judgeId: string
  judgeName: string
  judgeModel: string
  verdict: "pass" | "fail" | "inconclusive"
  reasoning: string
  createdAt: Timestamp
}
```

## 🎨 UI Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Dark Mode Ready**: Clean, modern interface with orange accent colors
- **Real-time Updates**: All data syncs in real-time via Firestore
- **Drag & Drop**: Intuitive file and image uploads
- **Loading States**: Clear feedback during async operations
- **Error Handling**: User-friendly error messages
- **Animations**: Smooth transitions and hover effects

## 🚀 Deployment

### Deploy to Firebase Hosting

1. Build the frontend:
```bash
npm run build
```

2. Deploy to Firebase:
```bash
firebase deploy
```

Or use the included deploy script:
```bash
./deploy.sh
```

## 📝 License

This project is private and proprietary.

## 🤝 Contributing

This is a private project. Contact the maintainer for contribution guidelines.

## 📧 Support

For issues or questions, please contact the development team.

---

**Built with ❤️ using React, Firebase, Gemini AI, and Groq**
