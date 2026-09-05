# Sign Language Interpreter (ASL → Text/Speech)

A Progressive Web App (PWA) for real-time American Sign Language interpretation using computer vision and machine learning.

## Architecture

```
├── frontend/          # React + TypeScript + Vite PWA
│   ├── src/
│   │   ├── components/    # VideoFeed, PredictionPanel, Controls
│   │   ├── hooks/         # useHandDetection, useASLClassifier
│   │   ├── utils/         # speech synthesis
│   │   └── types/         # TypeScript interfaces
│   └── public/            # PWA manifest, service worker, icons
└── backend/           # FastAPI for model training/serving
    ├── main.py              # API endpoints
    ├── train_model.py       # TensorFlow/Keras training
    └── requirements.txt     # Python dependencies
```

## Quick Start

### Frontend (Development)
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Backend (Development)
```bash
cd backend
pip install -r requirements.txt
python main.py
# API at http://localhost:8000
```

## Data Collection (Required for Training)

1. Start both frontend and backend
2. Open http://localhost:5173
3. Click "Start" to enable camera
4. Make ASL signs in front of camera
5. Use browser console to send samples:
```javascript
// Example: collect 50 samples of letter 'A'
for(let i=0;i<50;i++){
  fetch('http://localhost:8000/collect', {
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({landmarks: currentLandmarks, label:'A'})
  })
}
```
Or use the API directly with curl/Postman.

## Model Training

```bash
cd backend
python train_model.py --epochs 100 --batch-size 32
```

This will:
- Load collected samples from `backend/data/`
- Train a neural network classifier
- Save Keras model + convert to TF.js format in `backend/model/`
- Copy TF.js model to `frontend/public/model/` for deployment

## Deployment

### Frontend → Vercel
1. Push `frontend/` to GitHub
2. Import in Vercel (auto-detects Vite)
3. Set environment variables if needed

### Backend → Render
1. Push `backend/` to GitHub
2. Create Web Service on Render
3. Build: `pip install -r requirements.txt`
4. Start: `python main.py`
5. Add persistent disk for `/data` and `/model` directories

## PWA Features

- **Offline support** via service worker
- **Installable** on mobile/desktop
- **Camera access** via getUserMedia
- **Speech synthesis** for text-to-speech
- **Responsive** design for all screen sizes

## Model Details

- **Input**: 21 hand landmarks × 3 (x,y,z) = 63 features
- **Architecture**: 3-layer MLP (256→128→64→29 classes)
- **Classes**: A-Z, SPACE, DELETE, NOTHING (29 total)
- **Framework**: TensorFlow.js (runs entirely in browser)

## Adding FSL (Filipino Sign Language)

1. Collect FSL dataset (separate from ASL)
2. Add FSL labels to `ASL_LABELS` in both frontend/backend
3. Retrain model with combined or separate classifier
4. Add language selector in UI

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, MediaPipe Hands, TensorFlow.js
- **Backend**: FastAPI, TensorFlow/Keras, MediaPipe, scikit-learn
- **Deployment**: Vercel (static), Render (API)
- **PWA**: vite-plugin-pwa, Workbox

## Next Steps for Production

- [ ] Replace dummy model with trained ASL model
- [ ] Add confidence calibration
- [ ] Implement sequence modeling for words
- [ ] Add user authentication & history
- [ ] Optimize TF.js model size (< 5MB)
- [ ] Add FSL support
- [ ] Comprehensive testing