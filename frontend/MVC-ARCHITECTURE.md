# Green Build - MVC Architecture

## Smart Construction Management Platform

A JavaScript/React application with Tailwind CSS styling, following a strict MVC architecture.

---

## 📁 Folder Structure

```
src/
├── models/                    # (M) Data & State Layer
│   ├── api.js                 # Centralized Axios instance
│   ├── useProjectStore.js     # Global Zustand Store
│   └── index.js               # Barrel exports
│
├── views/                     # (V) UI Components Layer
│   ├── layouts/
│   │   └── MainLayout.jsx     # Dashboard shell (w-64 sidebar + h-16 header)
│   ├── modules/
│   │   ├── QuantityTakeoff/   # Module 1: CV & BOQ
│   │   │   └── index.jsx
│   │   ├── CostPrediction/    # Module 2: Risk & Overruns
│   │   │   └── index.jsx
│   │   ├── Sustainability/    # Module 3: Lifecycle & Carbon
│   │   │   └── index.jsx
│   │   └── DelayForecast/     # Module 4: Timeline & Delays
│   │       └── index.jsx
│   └── components/            # Reusable components
│       ├── Button.jsx
│       ├── Card.jsx
│       └── Table.jsx
│
├── controllers/               # (C) Logic & Hooks Layer
│   ├── useQuantityController.js
│   ├── useCostController.js
│   ├── useSustainabilityController.js
│   ├── useDelayController.js
│   └── index.js
│
├── App.jsx                    # Main application
├── main.jsx                   # Entry point
└── index.css                  # Tailwind CSS + custom styles
```

---

## 🎯 Technology Stack

| Layer | Technology |
|-------|------------|
| Language | JavaScript (.jsx) |
| Styling | Tailwind CSS |
| State | Zustand |
| Architecture | MVC |
| Build Tool | Vite |

---

## 🔄 Data Flow

The key architectural decision is that **Module 1 (Quantity Takeoff) drives all other modules**:

```
┌─────────────────┐
│  Floor Plan     │
│  Image Upload   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Module 1       │
│  Quantity       │
│  Takeoff        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Global Store   │  ← Zustand (useProjectStore)
│  quantityData   │
└────────┬────────┘
         │
    ┌────┴────┬────────────┐
    │         │            │
    ▼         ▼            ▼
┌───────┐ ┌────────┐ ┌─────────┐
│Module │ │Module  │ │Module   │
│2:Cost │ │3:Green │ │4:Delay  │
└───────┘ └────────┘ └─────────┘
```

---

## 📊 State Management (useProjectStore.js)

The Zustand store holds the following data shapes:

```javascript
/**
 * @typedef {Object} QuantityData
 * @property {number} wallLengthMeters - Total wall length
 * @property {number} wallGrossSurfaceAreaM2 - Gross wall area
 * @property {number} wallNetSurfaceAreaM2 - Net wall area (after deductions)
 * @property {number} deductionsAreaM2 - Door/window deductions
 * @property {Object} itemCounts - {doors, windows, rooms}
 * @property {Array} detectedRooms - Room detection results
 */

// Store structure
const store = {
  // Project info
  projectDetails: null,
  
  // Module 1 output - DRIVES OTHER MODULES
  quantityData: null,
  quantityResult: null,
  
  // Other module outputs
  costPrediction: null,
  sustainabilityResult: null,
  delayForecast: null,
  
  // UI state
  isLoading: false,
  activeModule: null,
  errors: {},
};
```

---

## 🎨 Tailwind CSS Configuration

The project uses a custom Tailwind configuration with:

- **Custom Colors**: `primary-*` (green), `dark-*` (slate)
- **Custom Animations**: `fade-in`, `slide-in`
- **Component Classes**: `.glass-card`, `.btn-primary`, `.input-field`

```javascript
// tailwind.config.js
theme: {
  extend: {
    colors: {
      primary: {
        500: '#22c55e',  // Main green
        // ...50-950 shades
      },
      dark: {
        900: '#0f172a',  // Main dark
        // ...50-950 shades
      }
    }
  }
}
```

---

## 🚀 Quick Start

```bash
# Install dependencies
cd frontend
npm install

# Start development server
npm run dev

# Open browser
# http://localhost:5173
```

---

## 📱 Module Views

### Module 1: Quantity Takeoff (`/views/modules/QuantityTakeoff/index.jsx`)

- Dashed border file upload area
- Parameters form (scale, wall height)
- BOQ results table
- Saves data to global store

### Module 2: Cost Prediction (`/views/modules/CostPrediction/index.jsx`)

- Reads `quantityData` from store
- Form inputs (duration, complexity, contractor grade)
- Risk level visualization
- SHAP feature importance chart

### Module 3: Sustainability (`/views/modules/Sustainability/index.jsx`)

- Material inputs management
- Lifecycle cost calculation
- Carbon footprint analysis
- Pareto frontier visualization

### Module 4: Delay Forecast (`/views/modules/DelayForecast/index.jsx`)

- Contractor and resource inputs
- Delay probability prediction
- Scenario analysis (best/most likely/worst)
- Delay drivers breakdown

---

## 🔧 Controller Patterns

Each controller follows this pattern:

```javascript
const useModuleController = () => {
  // Local state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Global store - READ quantity data
  const quantityData = useProjectStore((state) => state.quantityData);
  const hasQuantityData = quantityData !== null;

  // Actions
  const doAction = useCallback(async (input) => {
    if (!hasQuantityData) {
      setError('Complete Module 1 first');
      return;
    }
    
    setLoading(true);
    try {
      // Call API with quantityData
      const result = await api.call({ ...input, quantityData });
      // Store result in global state
      useProjectStore.getState().setResult(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hasQuantityData, quantityData]);

  return { loading, error, quantityData, hasQuantityData, doAction };
};
```

---

## 📝 Key Files

| File | Purpose |
|------|---------|
| `models/useProjectStore.js` | Zustand global state store |
| `models/api.js` | Centralized Axios instance |
| `views/layouts/MainLayout.jsx` | Dashboard shell (sidebar + header) |
| `controllers/useCostController.js` | Cost prediction business logic |
| `views/modules/QuantityTakeoff/index.jsx` | File upload + BOQ table |

---

## 🎯 Benefits of This Architecture

1. **Separation of Concerns** - Clear MVC boundaries
2. **Data Flow Clarity** - Module 1 output drives other modules
3. **Reusability** - Controllers can be used across views
4. **Testability** - Controllers can be unit tested
5. **Scalability** - Easy to add new modules

---

## 📄 License

MIT License - 2026
