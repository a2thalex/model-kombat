# 🥊 Model Kombat

An AI model competition platform that lets you pit different LLMs against each other in transparent, multi-phase competitions. Built with OpenRouter integration for seamless access to 200+ language models.

![React](https://img.shields.io/badge/React-18.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)
![OpenRouter](https://img.shields.io/badge/OpenRouter-API-green)
![Vite](https://img.shields.io/badge/Vite-5.0-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

## ✨ Features

### 🚀 Lazy Mode (NEW!)
The crown jewel of Model Kombat - automate iterative refinement across multiple AI models:
- **Auto-Refinement**: Automatically improves answers through multiple rounds
- **Flagship Auto-Detection**: Instantly enables the best models from OpenAI, Anthropic, Google, Meta, and more
- **Prompt Enhancement**: AI-powered prompt optimization for better results
- **Quality Scoring**: Track improvement with real-time quality metrics
- **Beautiful UI**: Modern interface with provider grouping and visual indicators

### 🎯 Three-Phase Competition System

#### Phase 1: Adversarial Refinement
- Models alternate between solving problems and providing critiques
- Each iteration improves upon the previous solution
- Transparent critique history shows the evolution of ideas

#### Phase 2: Competitive Generation
- All models tackle the same prompt simultaneously
- Configurable parameters (temperature, max tokens, etc.)
- Real-time streaming of responses
- Side-by-side comparison view

#### Phase 3: Anonymous Judging
- Blind evaluation by selected judge models
- JSON-structured scoring with detailed criteria
- Automatic winner determination
- Export results for analysis

### 🎨 Key Features

- **200+ Models**: Access to all OpenRouter models including GPT-4, Claude, Gemini, Llama, and more
- **Flagship Model Badges**: Visual indicators (👑) for premium models
- **Provider Organization**: Models grouped by company with custom colors
- **Real-time Streaming**: Watch responses generate in real-time
- **Hybrid Storage**: Firebase + localStorage fallback for reliability
- **Export Options**: PDF and JSON export for competition results
- **Dark Mode Support**: Full theme customization
- **Rate Limiting**: Built-in protection with Bottleneck (10 req/s)

## 🔒 Security Notice

**⚠️ IMPORTANT: Please read before deploying to production**

This application stores OpenRouter API keys client-side with basic obfuscation (NOT encryption). For personal or development use, this is acceptable with proper precautions. For production or multi-user deployments, you **must** implement additional security measures.

**Read the full [SECURITY.md](./SECURITY.md) document for:**
- API key security recommendations
- Production deployment checklist
- Best practices for Firebase configuration
- Rate limiting and monitoring setup

**Quick Security Tips:**
- ✅ Each user should use their own OpenRouter API key
- ✅ Set spending limits on your OpenRouter account
- ✅ Never share your deployment with untrusted users
- ✅ For production: implement a backend proxy for API calls
- ✅ Regularly rotate API keys and monitor usage

## 🛠️ Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **State Management**: Zustand
- **UI Components**: ShadCN UI + Radix UI + Tailwind CSS
- **API Integration**: OpenRouter (200+ LLMs)
- **Database**: Firebase Firestore (with localStorage fallback)
- **Authentication**: Firebase Auth
- **Styling**: Tailwind CSS + CSS-in-JS

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/model-kombat.git
   cd model-kombat
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   # OpenRouter API (Required)
   VITE_OPENROUTER_API_KEY=your_openrouter_api_key

   # Firebase Config (Optional - will use localStorage if not provided)
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 🚀 Quick Start Guide

### Setting Up Your First Competition

1. **Configure OpenRouter API**
   - Go to Settings → LLM Config
   - Enter your OpenRouter API key
   - Click "Load Model Catalog" to fetch available models

2. **Using Lazy Mode (Recommended for beginners)**
   - Navigate to "Lazy Mode" from the sidebar
   - Enter your question or prompt
   - Optional: Click "Enhance Prompt" for AI-powered optimization
   - Click "Generate & Refine" to start automatic refinement
   - Watch as multiple AI models iteratively improve the answer

3. **Creating a Full Competition**
   - Go to "New Project"
   - Configure competition parameters:
     - Name and description
     - Select participant models
     - Choose judge models
     - Set generation parameters
   - Start Phase 1: Adversarial Refinement
   - Progress through all three phases
   - Export results as PDF or JSON

## 🎯 Use Cases

- **AI Research**: Compare model capabilities across different tasks
- **Prompt Engineering**: Find the best model for specific use cases
- **Educational**: Learn how different models approach problems
- **Content Generation**: Get the best possible output through iterative refinement
- **Model Evaluation**: Systematic comparison of model performance

## 📊 Flagship Models

Model Kombat automatically detects and enables flagship models from major providers:

- **OpenAI**: GPT-4, GPT-4 Turbo, GPT-3.5 Turbo
- **Anthropic**: Claude 3.5 Sonnet, Claude 3 Opus, Claude 3 Haiku
- **Google**: Gemini Pro 1.5, Gemini Flash
- **Meta**: Llama 3.1 405B, Llama 3.1 70B
- **Mistral**: Large, Medium, Mixtral
- **xAI**: Grok Beta
- **And many more...**

## 🔧 Configuration

### Model Selection
- Flagship models are auto-enabled on catalog load
- Manual selection available for specific use cases
- Filter by capabilities (JSON, vision, function calling)
- Group by provider for easy navigation

### Competition Parameters
- **Temperature**: Control creativity vs consistency (0.0 - 1.0)
- **Max Tokens**: Set response length limits
- **Top-P**: Nucleus sampling parameter
- **System Prompts**: Custom instructions for each phase
- **Judge Criteria**: Define scoring rubrics

## 📝 API Usage

The app uses OpenRouter's unified API to access multiple model providers:

```javascript
// Example API call structure
const response = await openRouterService.createChatCompletion({
  model: 'openai/gpt-4-turbo-preview',
  messages: [{ role: 'user', content: 'Your prompt here' }],
  temperature: 0.7,
  stream: true
});
```

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── layout/       # Layout components
│   ├── model-selector/ # Model selection dropdown
│   └── ui/           # ShadCN UI components
├── features/         # Feature modules
│   ├── auth/        # Authentication
│   ├── projects/    # Project management
│   ├── phases/      # Competition phases
│   ├── llm-config/  # LLM configuration
│   └── lazy-mode/   # Lazy Mode feature
├── services/        # API and Firebase services
├── hooks/          # Custom React hooks
├── store/          # Zustand state management
├── types/          # TypeScript interfaces
├── utils/          # Helper functions
└── styles/         # Global styles
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [OpenRouter](https://openrouter.ai) for unified LLM API access
- [ShadCN UI](https://ui.shadcn.com) for beautiful React components
- [Radix UI](https://www.radix-ui.com) for accessible component primitives
- All the amazing open-source contributors

## 🔗 Links

- [OpenRouter API Documentation](https://openrouter.ai/docs)
- [Get OpenRouter API Key](https://openrouter.ai/keys)
- [Firebase Console](https://console.firebase.google.com)
- [Report Issues](https://github.com/yourusername/model-kombat/issues)

## 🚦 Status

- ✅ Core competition system
- ✅ Lazy Mode with auto-refinement
- ✅ Flagship model auto-detection
- ✅ OpenRouter integration
- ✅ Firebase + localStorage hybrid storage
- ✅ Export functionality
- 🚧 Team competitions (coming soon)
- 🚧 Competition history analytics (planned)
- 🚧 Custom evaluation metrics (planned)

---

Built with ❤️ for the AI community. Let the best model win! 🏆