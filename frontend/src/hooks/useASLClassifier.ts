import { useState, useCallback, useRef } from 'react'
import * as tf from '@tensorflow/tfjs'
import { HandLandmark, Prediction } from '../types'

const ASL_LABELS = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  'SPACE', 'DELETE', 'NOTHING'
]

const INPUT_SIZE = 63 // 21 landmarks * 3 (x, y, z)

export function useASLClassifier() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const modelRef = useRef<tf.LayersModel | null>(null)
  const normalizeRef = useRef<{ mean: number[], std: number[] } | null>(null)

  const loadModel = useCallback(async () => {
    try {
      setStatus('loading')
      
      // In production, load from your trained model
      // For MVP, we'll create a simple model structure
      // You'll need to replace this with your actual trained model
      const modelUrl = '/model/model.json' // Will be served from public folder
      
      try {
        modelRef.current = await tf.loadLayersModel(modelUrl)
        
        // Load normalization params
        const normResponse = await fetch('/model/normalize.json')
        if (normResponse.ok) {
          normalizeRef.current = await normResponse.json()
        }
        
        setStatus('ready')
      } catch {
        // Fallback: create a dummy model for development
        console.warn('Using dummy model - replace with trained model')
        modelRef.current = createDummyModel()
        normalizeRef.current = { 
          mean: new Array(INPUT_SIZE).fill(0), 
          std: new Array(INPUT_SIZE).fill(1) 
        }
        setStatus('ready')
      }
    } catch (err) {
      setStatus('error')
      console.error('Model load error:', err)
    }
  }, [])

  const classify = useCallback(async (landmarks: HandLandmark[]): Promise<Prediction[]> => {
    if (!modelRef.current || landmarks.length === 0) return []

    try {
      // Flatten and normalize landmarks
      const input = new Float32Array(INPUT_SIZE)
      landmarks.forEach((lm, i) => {
        const base = i * 3
        input[base] = lm.x
        input[base + 1] = lm.y
        input[base + 2] = lm.z
      })

      // Normalize
      if (normalizeRef.current) {
        const { mean, std } = normalizeRef.current
        for (let i = 0; i < INPUT_SIZE; i++) {
          input[i] = (input[i] - mean[i]) / (std[i] || 1)
        }
      }

      const tensor = tf.tensor2d([Array.from(input)])
      const prediction = modelRef.current.predict(tensor) as tf.Tensor
      const probs = await prediction.data()
      tensor.dispose()
      prediction.dispose()

      // Get top 5 predictions
      const results: Prediction[] = Array.from(probs)
        .map((confidence, index) => ({ label: ASL_LABELS[index], confidence }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5)

      return results
    } catch (err) {
      console.error('Classification error:', err)
      return []
    }
  }, [])

  return { loadModel, classify, status }
}

function createDummyModel(): tf.LayersModel {
  const model = tf.sequential()
  model.add(tf.layers.dense({ inputShape: [INPUT_SIZE], units: 128, activation: 'relu' }))
  model.add(tf.layers.dropout({ rate: 0.3 }))
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }))
  model.add(tf.layers.dense({ units: ASL_LABELS.length, activation: 'softmax' }))
  model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy' })
  return model
}