# AI-Driven Collaborative Platform for Predictive & Sustainable Quantity Surveying

## Project Code
RP_25_26J_347

## Degree Programme
Bachelor of Science (Honours) in Information Technology  
Sri Lanka Institute of Information Technology (SLIIT)

---

## 📌 Project Overview

The **AI-Driven Collaborative Platform for Predictive & Sustainable Quantity Surveying** is a cloud-based, intelligent system designed to modernize traditional Quantity Surveying (QS) practices using Artificial Intelligence and Machine Learning.

The platform integrates multiple AI-driven modules to support:
- Automated quantity takeoff from 2D construction drawings
- Construction delay forecasting
- Cost overrun prediction
- Lifecycle cost and sustainability analysis

By replacing manual, time-consuming, and error-prone QS methods, the system provides faster, more accurate, explainable, and sustainable decision support for construction professionals.

---

## 🧩 System Components & Individual Contributions

The system consists of **four main components**, each developed by a team member and integrated into a single collaborative platform.

---

### 1️⃣ Automated Quantity Takeoff from Construction Drawings  
**Student:** Perera N. R. C  
**Student ID:** IT22152282  

**Description:**  
This component uses Computer Vision and Deep Learning techniques to automatically detect and segment construction elements such as walls, doors, windows, and fixtures from 2D drawings. It converts pixel-based measurements into real-world quantities using scale detection and geometric validation.

**Technologies:**
- OpenCV
- PyTorch
- U-Net, Mask R-CNN
- OCR-based scale detection

---

### 2️⃣ Construction Delay Forecasting  
**Student:** Hettiarachchi A. N. M  
**Student ID:** IT22217622  

**Description:**  
A machine learning–based predictive system that forecasts construction delays using early project indicators such as location, project size, contractor grade, financial attributes, and duration. The system supports both regression and classification outputs.

**Technologies:**
- Python
- Scikit-learn
- XGBoost
- FastAPI
- SHAP (Explainable AI)

---

### 3️⃣ Lifecycle Cost & Sustainability Analysis  
**Student:** Morayas G. J. G  
**Student ID:** IT22292254  

**Description:**  
This component evaluates construction projects across their entire lifecycle by optimizing cost and sustainability simultaneously. It incorporates environmental impact databases and multi-objective optimization techniques.

**Technologies:**
- Genetic Algorithms
- Particle Swarm Optimization
- Monte Carlo Simulation
- EPD, ecoinvent, IMPACT World+ databases

---

### 4️⃣ Cost Overrun Prediction System  
**Student:** Gunasekara S. G. V. T. P  
**Student ID:** IT22333520  

**Description:**  
A predictive analytics module that estimates cost overrun percentages and identifies high-risk projects. The system integrates multiple data sources and provides explainable predictions to support Quantity Surveyors.

**Technologies:**
- Random Forest
- Gradient Boosting
- SHAP Explainability
- FastAPI
- React.js

---

## 🏗️ System Architecture

The platform follows a **cloud-native microservices architecture** to ensure scalability, modularity, and collaborative development.

### Architecture Layers:
1. **Presentation Layer** – React.js Web Interface  
2. **Application Layer** – Backend Microservices (Node.js / FastAPI)  
3. **AI & ML Layer** – ML models, CV pipelines, optimization engines  
4. **Data Layer** – MongoDB, PostgreSQL, Redis, GridFS  
5. **Deployment Layer** – Docker, Cloud Infrastructure (AWS)

### Architecture Diagram
*(Add the architecture diagram image to `/docs` folder and reference it below)*

```md
![System Architecture](docs/architecture-diagram.png)
