# 🌱 Green Build: AI-Driven Collaborative Platform for Predictive & Sustainable Quantity Surveying

## 📋 Project Information

| Property | Value |
|----------|-------|
| **Project Code** | RP_25_26J_347 |
| **Degree Programme** | Bachelor of Science (Honours) in Information Technology |
| **Institution** | Sri Lanka Institute of Information Technology (SLIIT) |
| **Academic Year** | 2025-2026 |

---

## 📌 Project Overview

The **Green Build** platform is a cloud-based, intelligent system designed to modernize traditional Quantity Surveying (QS) practices using Artificial Intelligence and Machine Learning.

### Problem Statement
Traditional quantity surveying is:
- **Time-consuming** – Manual measurements from drawings
- **Error-prone** – Human calculation mistakes
- **Inefficient** – Lacks predictive insights
- **Unsustainable** – Doesn't consider environmental impact

### Solution
An integrated AI platform that automates and enhances QS processes by providing:
- ✅ Automated quantity takeoff from 2D construction drawings
- ✅ Construction delay forecasting with explainable predictions
- ✅ Cost overrun prediction for risk assessment
- ✅ Lifecycle cost and sustainability analysis

This delivers **faster**, **more accurate**, **explainable**, and **sustainable** decision support for construction professionals.

---

## 🏗️ System Architecture

The platform follows a **cloud-native microservices architecture** ensuring scalability, modularity, and collaborative development.

### Architecture Layers:
1. **Presentation Layer** – React.js Web Interface (Frontend)
2. **Application Layer** – Express.js API Gateway (Backend)
3. **AI & ML Layer** – Python FastAPI Microservices
4. **Data Layer** – MongoDB, PostgreSQL, Redis, GridFS
5. **Deployment Layer** – Docker, Cloud Infrastructure

### Technology Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 19, Vite, TailwindCSS, Ant Design, Zustand |
| **Backend** | Node.js 18+, Express.js, MongoDB, Mongoose |
| **ML Services** | Python 3.8+, FastAPI, TensorFlow, Scikit-learn, XGBoost |
| **DevOps** | Docker, Docker Compose, AWS |

---

## 🧩 System Components & Team Contributions

The system consists of **four main ML components**, each developed by a dedicated team member and integrated into a single collaborative platform.

### 1️⃣ Automated Quantity Takeoff from Construction Drawings  
**Developer:** Perera N. R. C (IT22152282)

**Description:**  
Automated extraction of construction quantities from 2D drawings using Computer Vision and Deep Learning. The system:
- Detects construction elements (walls, doors, windows, fixtures)
- Segments elements using semantic and instance segmentation
- Converts pixel measurements to real-world quantities
- Validates measurements using geometric constraints

**Key Technologies:**
- **Computer Vision:** OpenCV
- **Deep Learning:** PyTorch, U-Net, Mask R-CNN
- **Scale Detection:** OCR-based scale extraction
- **API:** FastAPI

**Features:**
- Batch processing of multiple drawings
- Real-time preview with annotations
- Export to BOQ format
- Integration with project management

**Location:** [ml-services/quantity-takeoff-ml/](ml-services/quantity-takeoff-ml/)

---

### 2️⃣ Construction Delay Forecasting  
**Developer:** Hettiarachchi A. N. M (IT22217622)

**Description:**  
Machine Learning-based predictive system that forecasts construction delays using early project indicators:
- Project characteristics (location, size, contractor grade)
- Financial attributes (budget, funding sources)
- Duration and timeline factors
- Historical project data

**Key Technologies:**
- **ML Frameworks:** Scikit-learn, XGBoost
- **Explainability:** SHAP (SHapley Additive exPlanations)
- **API:** FastAPI
- **Data Processing:** Pandas, NumPy

**Features:**
- Regression & classification outputs
- Feature importance analysis
- Risk categorization (Low/Medium/High)
- SHAP explainability for decision transparency
- Model interpretability for stakeholder communication

**Location:** [ml-services/delay-prediction-ml/](ml-services/delay-prediction-ml/)

---

### 3️⃣ Lifecycle Cost & Sustainability Analysis  
**Developer:** Morayas G. J. G (IT22292254)

**Description:**  
Comprehensive environmental and cost impact assessment across the entire project lifecycle:
- Multi-objective optimization of cost and sustainability
- Environmental impact quantification (Carbon footprint, embodied energy)
- Material lifecycle analysis (Cradle-to-grave)
- Sustainable material alternatives recommendation

**Key Technologies:**
- **Optimization:** Genetic Algorithms, Particle Swarm Optimization
- **Simulation:** Monte Carlo Simulation
- **Databases:** EPD, ecoinvent, IMPACT World+
- **API:** FastAPI
- **Analysis:** Python (NumPy, SciPy)

**Features:**
- Pareto-optimal solutions
- Multi-criteria decision analysis
- Scenario planning and sensitivity analysis
- Sustainability reporting
- Carbon footprint calculation
- Cost-benefit analysis

**Location:** [ml-services/sustainability-ml/](ml-services/sustainability-ml/)

---

### 4️⃣ Cost Overrun Prediction System  
**Developer:** Gunasekara S. G. V. T. P (IT22333520)

**Description:**  
Advanced predictive analytics module for construction cost estimation:
- Predicts cost overrun percentages
- Identifies high-risk projects
- Provides risk indicators and warnings
- Integrates multiple data sources for accuracy

**Key Technologies:**
- **ML Algorithms:** Random Forest, Gradient Boosting (XGBoost)
- **Explainability:** SHAP
- **API:** FastAPI
- **Frontend Integration:** React.js
- **Data Processing:** Pandas, Scikit-learn, TensorFlow

**Features:**
- Dual model approach (regression + classification)
- Feature preprocessing and validation
- Missing value imputation
- Categorical encoding
- Feature scaling and alignment
- Real-time predictions
- Comprehensive error handling

**Location:** [ml-services/cost-overrun-prediction-ml/](ml-services/cost-overrun-prediction-ml/)

---

## 📁 Project Structure

```
Green-Build/
├── frontend/                           # React.js Web Application
│   ├── src/
│   │   ├── components/                # Reusable React components
│   │   ├── controllers/               # Business logic & hooks
│   │   ├── models/                    # API models & Zustand stores
│   │   ├── services/                  # API service layer
│   │   ├── views/                     # Page layouts
│   │   ├── App.jsx                    # Main App component
│   │   └── main.jsx                   # Entry point
│   ├── package.json                   # Dependencies
│   ├── vite.config.js                 # Vite bundler config
│   ├── tailwind.config.js             # TailwindCSS config
│   └── eslint.config.js               # Linting rules
│
├── backend/                           # Express.js API Gateway
│   ├── controllers/                   # Request handlers
│   │   ├── authController.js
│   │   ├── projectController.js
│   │   ├── costPredictionController.js
│   │   ├── delayPredictionController.js
│   │   ├── sustainabilityController.js
│   │   ├── floorPlanController.js
│   │   ├── boqController.js
│   │   ├── uploadController.js
│   │   └── healthController.js
│   ├── models/                        # Database schemas
│   │   ├── User.js
│   │   ├── Project.js
│   │   ├── costModel.js
│   │   ├── FloorPlan.js
│   │   ├── BOQReport.js
│   │   └── fileModel.js
│   ├── routes/                        # API route definitions
│   │   ├── authRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── costPredictionRoutes.js
│   │   ├── delayPredictionRoutes.js
│   │   ├── sustainabilityRoutes.js
│   │   ├── floorPlanRoutes.js
│   │   ├── boqRoutes.js
│   │   ├── uploadRoutes.js
│   │   └── healthRoutes.js
│   ├── middleware/                    # Express middleware
│   │   ├── authMiddleware.js          # JWT authentication
│   │   └── errorHandler.js            # Error handling
│   ├── config/                        # Configuration files
│   │   ├── database.js                # MongoDB connection
│   │   └── index.js                   # Environment config
│   ├── services/                      # Business logic services
│   │   └── pythonService.js           # Python ML service integration
│   ├── views/                         # Response templates
│   │   └── errorView.js
│   ├── package.json                   # Dependencies
│   └── server.js                      # Application entry point
│
├── ml-services/                       # Python ML Microservices
│   ├── cost-overrun-prediction-ml/    # Cost prediction service
│   │   ├── app/
│   │   │   ├── main.py                # FastAPI application
│   │   │   ├── config.py              # Configuration
│   │   │   ├── api/
│   │   │   │   └── endpoints.py       # API routes
│   │   │   ├── models/
│   │   │   │   └── schemas.py         # Pydantic models
│   │   │   └── services/              # Business logic
│   │   ├── models/                    # Trained ML models
│   │   ├── run.py                     # Service launcher
│   │   └── requirements.txt
│   │
│   ├── delay-prediction-ml/           # Delay prediction service
│   │   ├── app/
│   │   ├── models/
│   │   ├── run.py
│   │   └── requirements.txt
│   │
│   ├── quantity-takeoff-ml/           # Quantity takeoff service
│   │   ├── app/
│   │   ├── models/
│   │   ├── src/
│   │   ├── run.py
│   │   └── requirements.txt
│   │
│   └── sustainability-ml/             # Sustainability analysis service
│       ├── app/
│       ├── models/
│       ├── run.py
│       └── requirements.txt
│
└── README.md                          # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** 18+ (for backend and frontend)
- **Python:** 3.8+ (for ML services)
- **MongoDB:** 4.4+ (for database)
- **Git:** Latest version

### Installation & Setup

#### 1️⃣ Clone the Repository
```bash
git clone https://github.com/your-org/Green-Build.git
cd Green-Build
```

#### 2️⃣ Frontend Setup
```bash
cd frontend
npm install
npm run build    
npm run dev     
```

#### 3️⃣ Backend Setup
```bash
cd ../backend
npm install
npm run dev      
npm start       
```

#### 4️⃣ ML Services Setup

Each ML service runs independently on its own port.

**Cost Overrun Prediction:**
```bash
cd ml-services/cost-overrun-prediction-ml
pip install -r requirements.txt
python run.py
```

**Delay Prediction:**
```bash
cd ml-services/delay-prediction-ml
pip install -r requirements.txt
python run.py
```

**Quantity Takeoff:**
```bash
cd ml-services/quantity-takeoff-ml
pip install -r requirements.txt
python run.py
```

**Sustainability Analysis:**
```bash
cd ml-services/sustainability-ml
pip install -r requirements.txt
python run.py
```

---

## 📊 Component-Wise Details

### Frontend (React + Vite)
**Purpose:** User-facing web application for the Green Build platform

**Key Features:**
- Responsive UI with TailwindCSS
- Authentication & authorization
- Project management dashboard
- File upload for drawings and BOQ documents
- Real-time predictions and analysis results
- Sustainability metrics visualization
- Cost analysis and risk assessment dashboards

**Running:**
```bash
cd frontend
npm run dev     # Start dev server (http://localhost:5173)
npm run build   # Create production bundle
npm run lint    # Run ESLint
```

**Key Dependencies:**
- React 19 – UI framework
- React Router – Client-side routing
- Zustand – State management
- Axios – HTTP client
- Ant Design – UI component library
- TailwindCSS – Utility-first CSS

---

### Backend (Express.js)
**Purpose:** Central API gateway managing all frontend requests and ML service integration

**Key Features:**
- RESTful API endpoints
- JWT-based authentication
- File upload/download with GridFS
- Integration with all ML services
- MongoDB/PostgreSQL data persistence
- Error handling and logging
- CORS-enabled for cross-origin requests
- Health check endpoints

**Running:**
```bash
cd backend
npm run dev     # Start with nodemon (http://localhost:3000)
npm start       # Production mode
```

**API Routes:**
- `/api/auth/` – Authentication
- `/api/projects/` – Project management
- `/api/cost-prediction/` – Cost predictions
- `/api/delay-prediction/` – Delay predictions
- `/api/sustainability/` – Sustainability analysis
- `/api/quantity-takeoff/` – Quantity extraction
- `/api/upload/` – File uploads
- `/api/health/` – Health checks

---

### ML Services (Python + FastAPI)

#### Cost Overrun Prediction Service
**Purpose:** Predict construction cost overruns and identify risk factors

**API Endpoints:**
- `POST /predict/` – Single prediction
- `POST /predict/batch/` – Batch predictions
- `GET /health/` – Health check
- `GET /model-info/` – Model metadata

**Input Schema:**
```json
{
  "project_location": "string",
  "project_size": "float",
  "contractor_grade": "string",
  "budget": "float",
  "duration_months": "integer"
}
```

**Output Schema:**
```json
{
  "cost_overrun_percentage": "float",
  "risk_level": "string (Low/Medium/High)",
  "confidence_score": "float",
  "feature_importance": "object",
  "explanation": "string"
}
```

**Running:**
```bash
cd ml-services/cost-overrun-prediction-ml
python run.py  # Runs on http://localhost:8001
```

#### Delay Prediction Service
**Purpose:** Forecast construction project delays

**API Endpoints:**
- `POST /predict/` – Predict delays
- `POST /predict-all/` – Predict with all metrics
- `GET /health/` – Health check

**Running:**
```bash
cd ml-services/delay-prediction-ml
python run.py  # Runs on http://localhost:8002
```

#### Quantity Takeoff Service
**Purpose:** Extract quantities from construction drawings

**API Endpoints:**
- `POST /extract/` – Extract quantities from image
- `POST /batch-extract/` – Process multiple drawings
- `GET /health/` – Health check

**Running:**
```bash
cd ml-services/quantity-takeoff-ml
python run.py  # Runs on http://localhost:8003
```

#### Sustainability Analysis Service
**Purpose:** Analyze environmental impact and sustainability metrics

**API Endpoints:**
- `POST /analyze/` – Analyze sustainability
- `POST /compare-materials/` – Compare sustainable alternatives
- `GET /health/` – Health check

**Running:**
```bash
cd ml-services/sustainability-ml
python run.py  # Runs on http://localhost:8004
```

---

## 🏛️ System Architecture Diagram

```
                                    ┌─────────────────┐
                                    │   React.js      │
                                    │   Web Browser   │
                                    │     (Vite)      │
                                    └────────┬────────┘
                                             │
                                             │ HTTP/REST
                                             ↓
                          ┌──────────────────────────────────┐
                          │   Express.js API Gateway         │
                          │  (Backend - Node.js)             │
                          │                                  │
                          │  - Authentication (JWT)          │
                          │  - Request Routing               │
                          │  - File Management (GridFS)      │
                          └──────────────────────────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 │                    │                    │
                 ↓                    ↓                    ↓
        ┌────────────────┐  ┌──────────────────┐  ┌──────────────┐
        │   MongoDB      │  │   PostgreSQL     │  │    Redis     │
        │   User Data    │  │   Project Data   │  │    Caching   │
        │   Projects     │  │   Predictions    │  │              │
        └────────────────┘  └──────────────────┘  └──────────────┘
                 │
                 │
    ┌────────────┼────────────────┬────────────────┬─────────────────┐
    │            │                │                │                 │
    ↓            ↓                ↓                ↓                 ↓
┌─────────┐  ┌──────────┐  ┌─────────────┐ ┌───────────┐ ┌──────────────┐
│ Cost    │  │ Delay    │  │ Quantity    │ │Sustainab- │ │  Health &    │
│Overrun  │  │Prediction│  │ Takeoff     │ │ility      │ │  Monitoring  │
│(FastAPI)│  │(FastAPI) │  │ (FastAPI)   │ │(FastAPI)  │ │              │
│Port8001 │  │Port8002  │  │ Port8003    │ │Port8004   │ │              │
└─────────┘  └──────────┘  └─────────────┘ └───────────┘ └──────────────┘
     │            │              │              │
     │ Models:    │ Models:       │ Models:      │ Models:
     │ • ANN      │ • XGBoost     │ • U-Net      │ • GA/PSO
     │ • TF/SK    │ • Sklearn     │ • Mask R-CNN │ • Simulation
     │ • Explainable• SHAP       │ • PyTorch    │ • EPD/ecoinvent
     └─────────────────────────────────────────────┘

                        ▼ Cloud Deployment ▼
                
                    ┌────────────────┐
                    │  Docker        │
                    │  AWS / Cloud   │
                    └────────────────┘
```

### Architecture Components:

1. **Frontend Tier** – React.js with responsive UI, state management via Zustand
2. **API Gateway** – Express.js routing requests to appropriate microservices
3. **Database Tier** – MongoDB for documents, PostgreSQL for relational data, Redis for caching
4. **ML Microservices** – Four independent Python FastAPI services for predictions
5. **Cloud Deployment** – Containerized services for scalability and reliability

---

## 👥 Team

| Role | Name | Student ID | Component |
|------|------|-----------|-----------|
| Quantity Takeoff | Perera N. R. C | IT22152282 | ML-CV |
| Delay Prediction | Hettiarachchi A. N. M | IT22217622 | ML-Predictive |
| Sustainability | Morayas G. J. G | IT22292254 | ML-Optimization |
| Cost Prediction | Gunasekara S. G. V. T. P | IT22333520 | ML-Analytics |

---

## 📞 Contact

**Institution:** Sri Lanka Institute of Information Technology (SLIIT)  
**Program:** Bachelor of Science (Honours) in Information Technology  
**Project Code:** RP_25_26J_347  
**Academic Year:** 2025-2026

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
3. **AI & ML Layer** – ML models, CV pipelines, optimization engines  
4. **Data Layer** – MongoDB, PostgreSQL, Redis, GridFS  
5. **Deployment Layer** – Docker, Cloud Infrastructure (AWS)

### Architecture Diagram
*(Add the architecture diagram image to `/docs` folder and reference it below)*

```md
![System Architecture](docs/architecture-diagram.png)
