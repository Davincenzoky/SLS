import { useEffect, useRef, useState, useCallback } from 'react'
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import { HandDetection } from '../types'

interface UseHandDetectionOptions {
  onDetections: (detections: HandDetection[]) => void
  onError: (error: Error) => void
}

interface UseHandDetectionReturn {
  startDetection: () => Promise<void>
  stopDetection: () => void
  status: 'idle' | 'loading' | 'ready' | 'error'
}

export function useHandDetection(options: UseHandDetectionOptions): UseHandDetectionReturn {
  const { onDetections, onError } = options
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  
  const handLandmarkerRef = useRef<HandLandmarker | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const animationRef = useRef<number>()
  const isDetectingRef = useRef(false)

  const initializeLandmarker = useCallback(async () => {
    try {
      setStatus('loading')
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.12/wasm'
      )
      
      handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU'
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.5,
        minHandPresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      })
      setStatus('ready')
    } catch (err) {
      setStatus('error')
      onError(new Error('Failed to initialize hand detection'))
    }
  }, [onError])

  const detectFrame = useCallback(async () => {
    if (!isDetectingRef.current || !handLandmarkerRef.current || !videoRef.current) return

    try {
      const video = videoRef.current
      if (video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationRef.current = requestAnimationFrame(detectFrame)
        return
      }

      const results = handLandmarkerRef.current.detectForVideo(video, performance.now())
      
      const detections: HandDetection[] = results.landmarks.map((landmarks: any[], i: number) => ({
        landmarks: landmarks.map((l: any) => ({ x: l.x, y: l.y, z: l.z })),
        handedness: results.handedness[i]?.[0]?.categoryName === 'Left' ? 'Left' : 'Right',
        confidence: results.handedness[i]?.[0]?.score || 0
      }))

      onDetections(detections)
    } catch (err) {
      onError(new Error('Detection failed'))
    }

    animationRef.current = requestAnimationFrame(detectFrame)
  }, [onDetections, onError])

  const startDetection = useCallback(async () => {
    if (isDetectingRef.current) return

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      })

      const video = document.createElement('video')
      video.srcObject = stream
      video.play()
      await video.play()
      
      videoRef.current = video

      if (!handLandmarkerRef.current) {
        await initializeLandmarker()
      }

      isDetectingRef.current = true
      detectFrame()
    } catch (err) {
      onError(new Error('Camera access denied'))
      setStatus('error')
    }
  }, [initializeLandmarker, detectFrame, onError])

  const stopDetection = useCallback(() => {
    isDetectingRef.current = false
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach(track => track.stop())
    }
    videoRef.current = null
  }, [])

  useEffect(() => {
    return () => {
      stopDetection()
    }
  }, [stopDetection])

  return { startDetection, stopDetection, status }
}