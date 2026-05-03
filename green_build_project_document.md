# Green Build: AI-Driven Collaborative Platform for Predictive and Sustainable Quantity Surveying

## Project Information

| Property | Value |
|---|---|
| Project Code | RP_25_26J_347 |
| Degree Programme | Bachelor of Science (Honours) in Information Technology |
| Institution | Sri Lanka Institute of Information Technology (SLIIT) |
| Academic Year | 2025-2026 |
| Project Title | Green Build: AI-Driven Collaborative Platform for Predictive and Sustainable Quantity Surveying |
| Team Members | Add your group member names and registration numbers here |
| Supervisor | Add your supervisor name here |

---

## Project Overview

Green Build is a cloud-based construction management platform that applies artificial intelligence and machine learning to improve quantity surveying workflows. The system brings together automated quantity takeoff, delay prediction, cost overrun prediction, and sustainability analysis in a single collaborative environment.

The goal of the project is to reduce manual effort, improve estimation accuracy, and provide faster decision support for construction professionals.

### Problem Statement

Traditional quantity surveying and early-stage construction planning often suffer from:

- Time-consuming manual takeoff processes
- Human error in quantity and cost calculations
- Limited predictive insight for delay and cost risk
- Weak integration between estimation, reporting, and sustainability analysis

### Proposed Solution

Green Build addresses these issues by providing:

- Automated quantity extraction from floor plans and construction drawings
- AI-based delay prediction for early risk detection
- Cost overrun prediction for financial planning
- Sustainability analysis for lifecycle and environmental evaluation
- A web-based dashboard for project collaboration and reporting

---

## System Architecture

The system follows a modular cloud-native architecture.

### Architecture Layers

1. Presentation Layer: React frontend
2. Application Layer: Node.js and Express backend
3. AI / ML Layer: Python FastAPI microservices
4. Data Layer: MongoDB, PostgreSQL, and file storage
5. Deployment Layer: Docker and Docker Compose

### Main Components

| Component | Description |
|---|---|
| Frontend | User interface for project management, uploads, predictions, and reports |
| Backend | API gateway for authentication, data handling, and service orchestration |
| Quantity Takeoff ML | Detects construction elements from floor plans and supports BOQ generation |
| Delay Prediction ML | Predicts likely project delay and supports risk categorization |
| Cost Overrun ML | Estimates budget overrun risk and financial impact |
| Sustainability ML | Evaluates cost and environmental performance across the project lifecycle |

---

## Technology Stack

| Layer | Technologies |
|---|---|
| Frontend | React, Vite, TailwindCSS, Ant Design |
| Backend | Node.js, Express.js, Mongoose |
| ML Services | Python, FastAPI, TensorFlow, PyTorch, Scikit-learn, XGBoost |
| Data Storage | MongoDB, PostgreSQL, file-based storage |
| DevOps | Docker, Docker Compose |

---

## Core Project Modules

### 1. Quantity Takeoff

This module automates the extraction of construction quantities from floor plans and drawings. It is designed to reduce manual measurement work and improve accuracy in early estimation.

Key capabilities:

- Floor plan upload and preprocessing
- Element detection and annotation
- Quantity extraction and validation
- BOQ support for downstream reporting

### 2. Delay Prediction

This module predicts possible project delays using historical and project-specific attributes.

Key capabilities:

- Early project risk evaluation
- Delay classification or regression-based forecasting
- Explainable outputs for user interpretation

### 3. Cost Overrun Prediction

This module estimates the probability and magnitude of budget overruns.

Key capabilities:

- Cost risk estimation
- Project feature analysis
- Decision support for budgeting and planning

### 4. Sustainability Analysis

This module provides sustainability and lifecycle-related evaluation for project planning.

Key capabilities:

- Material and lifecycle assessment
- Cost and carbon-related analysis
- Sustainability reporting

### 5. Web Application and API Layer

The frontend and backend combine to provide a single platform for authentication, project management, uploads, prediction workflows, and report access.

---

## Data Flow

1. The user logs in and creates or opens a project.
2. The user uploads floor plans or project data.
3. The backend forwards data to the appropriate ML service.
4. ML services return predictions, detections, or analysis results.
5. The backend stores and organizes the output.
6. The frontend presents results for review, decision-making, and reporting.

---

## Deployment Approach

The system is designed for containerized deployment.

### Main Deployment Units

- Frontend container
- Backend API container
- Quantity takeoff ML container
- Cost overrun ML container
- Delay prediction ML container
- Sustainability ML container

### Benefits of the Deployment Design

- Independent service scaling
- Easier maintenance and updates
- Clear separation between web, API, and AI logic
- Better support for local and cloud deployment

---

## Expected Outcomes

The project is expected to achieve the following outcomes:

- Faster and more accurate quantity surveying workflows
- Better estimation support for cost and delay risks
- Improved collaboration across project stakeholders
- More informed sustainability-related decision-making
- Reduced manual work in early project planning

---

## Conclusion

Green Build is intended to modernize construction planning and quantity surveying through automation, prediction, and sustainability-aware decision support. By combining multiple AI-driven modules in one platform, the system aims to improve both efficiency and reliability in project management workflows.
