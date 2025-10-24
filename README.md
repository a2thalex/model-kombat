# Model Kombat

A transparent, multi-phase AI model competition platform that helps users rigorously refine and compare AI-generated answers through adversarial refinement, competitive generation, and anonymous judging.

## Overview

Model Kombat enables users to:
- **Refine**: Iteratively improve prompts and answers through adversarial critique
- **Compete**: Generate multiple competing answers from different models
- **Judge**: Score answers objectively against weighted criteria

All model interactions are powered by OpenRouter, providing access to a wide variety of state-of-the-art language models.

## Features

### Three-Phase Competition System

1. **Adversarial Refinement**: A single model iteratively critiques and improves its answer for N rounds
2. **Competitive Generation**: Multiple models produce competing answers to the refined prompt
3. **Anonymous Judging**: A judge model scores answers against weighted criteria and selects a winner

### Key Capabilities

- 🔄 Iterative refinement with configurable rounds (1-10)
- 🏆 Head-to-head model competitions (2-5 competitors)
- 📊 Customizable grading criteria with weighted scoring
- 🎭 Anonymous judging to prevent bias
- 📈 Real-time streaming and progress tracking
- 💾 Project persistence and resume capability
- 📄 Export results as PDF or JSON
- 🔒 Secure API key management

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: ShadCN UI + Tailwind CSS
- **Backend**: Firebase (Auth + Firestore)
- **AI Models**: OpenRouter API
- **State Management**: Zustand
- **Real-time**: Firestore listeners
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ and npm
- OpenRouter API key ([Get one here](https://openrouter.ai))
- Firebase project (free tier is sufficient)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/model-kombat.git
cd model-kombat
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

4. Start the development server:
```bash
npm run dev
```

## Project Structure

```
src/
├── components/        # Reusable UI components
├── features/          # Feature modules
│   ├── auth/         # Authentication
│   ├── projects/     # Project management
│   ├── llm-config/   # LLM configuration
│   └── execution/    # Competition execution
├── services/         # API and Firebase services
├── hooks/           # Custom React hooks
├── store/           # State management
├── types/           # TypeScript interfaces
├── utils/           # Helper functions
└── styles/          # Global styles
```

## Usage

### Setting Up OpenRouter

1. Navigate to the LLM Configuration tab
2. Enter your OpenRouter API key
3. Test the connection to fetch available models
4. Enable models you want to use in competitions

### Creating a Project

1. Click "New Project" from the Projects tab
2. Enter your question or prompt
3. Configure the three phases:
   - **Refiner**: Select model and number of rounds
   - **Competitors**: Choose 2-5 models
   - **Judge**: Pick a JSON-capable model and set criteria
4. Start the project and watch the competition unfold

### Understanding Results

- Each phase displays real-time progress
- Final scorecard shows weighted scores per criterion
- Click "Reveal Source Models" to see which model produced each answer
- Export results as PDF or JSON for further analysis

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler
npm test            # Run tests
```

### Code Style

- TypeScript for type safety
- ESLint + Prettier for code formatting
- Conventional Commits for version control

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Security

- OpenRouter API keys are stored encrypted server-side
- User data is isolated via Firestore security rules
- All model interactions transit through OpenRouter's secure API
- Content safety measures in place for input/output

## License

MIT License - see [LICENSE](LICENSE) file for details

## Acknowledgments

- Built with OpenRouter for model access
- UI components from ShadCN
- Icons from Lucide
- Powered by Firebase

## Support

- Report issues: [GitHub Issues](https://github.com/yourusername/model-kombat/issues)
- Documentation: [Wiki](https://github.com/yourusername/model-kombat/wiki)
- Contact: your.email@example.com

---

**Model Kombat** - Where AI models compete for the best answer 🏆