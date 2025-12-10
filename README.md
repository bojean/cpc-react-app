# CPC React App

A React-based application for managing vaccination services, queues, and administrative functions.

## Project Structure

- **frontend/**: React application
- **backend/**: Node.js Express API server
- **.github/**: GitHub configuration and documentation

## GitHub Copilot Configuration

This project is configured to work with GitHub Copilot using the **GPT-5.1-Codex-Max** model.

### Important Note

The GPT-5.1-Codex-Max model does not support the `top_p` parameter. See `.github/README.md` for detailed configuration information.

## Getting Started

### Backend Setup

```bash
cd backend
npm install
npm start
```

The backend server will run on `http://localhost:5000`.

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

The frontend application will run on `http://localhost:3000`.

## Environment Variables

### Backend (.env)

```
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=cpcdb
DB_PORT=5432
JWT_SECRET=your_secret_key
PORT=5000
```

## Features

- User authentication and authorization
- Vaccination management
- Queue management
- Agent commands and product tracking
- PDF generation for reports
- Multi-language support (i18n)

## Technologies Used

- **Frontend**: React, Bootstrap, Axios, React-i18next
- **Backend**: Node.js, Express, PostgreSQL, JWT, PDF-lib
- **AI Integration**: GitHub Copilot with GPT-5.1-Codex-Max

## AI Model Compatibility

This project is compatible with GitHub Copilot's GPT-5.1-Codex-Max model. For details on model limitations and supported parameters, see:

- `.github/copilot-instructions.md` - Human-readable documentation
- `.github/copilot-model-config.json` - Machine-readable configuration
- `.github/README.md` - Detailed GitHub configuration guide

## Contributing

When contributing to this project:
1. Ensure code is compatible with the configured AI model
2. Do not use unsupported parameters (e.g., `top_p`) in any AI API integrations
3. Follow the project's coding standards and conventions

## License

ISC
