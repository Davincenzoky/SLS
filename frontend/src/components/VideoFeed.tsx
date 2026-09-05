import { useRef, useEffect, useState } from 'react'
import { HandDetection } from '../types'

interface VideoFeedProps {
  detections: HandDetection[]
  isRunning: boolean
  handStatus: string
  classifierStatus: string
}

export function VideoFeed({ detections, isRunning, handStatus, classifierStatus }: VideoFeedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [mirror, setMirror] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const drawLoop = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight

        ctx.save()
        if (mirror) {
          ctx.translate(canvas.width, 0)
          ctx.scale(-1, 1)
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        ctx.restore()

        // Draw hand landmarks
        detections.forEach(detection => {
          drawHandLandmarks(ctx, detection, canvas.width, canvas.height, mirror)
        })
      }
      requestAnimationFrame(drawLoop)
    }

    drawLoop()
  }, [detections, mirror])

  const drawHandLandmarks = (
    ctx: CanvasRenderingContext2D,
    detection: HandDetection,
    width: number,
    height: number,
    mirror: boolean
  ) => {
    const { landmarks } = detection
    if (landmarks.length !== 21) return

    const connections = [
      [0,1],[1,2],[2,3],[3,4], // thumb
      [0,5],[5,6],[6,7],[7,8], // index
      [5,9],[9,10],[10,11],[11,12], // middle
      [9,13],[13,14],[14,15],[15,16], // ring
      [13,17],[17,18],[18,19],[19,20], // pinky
      [0,17] // palm
    ]

    // Draw connections
    ctx.strokeStyle = '#2563eb'
    ctx.lineWidth = 2
    ctx.beginPath()
    connections.forEach(([a, b]) => {
      const pa = landmarks[a]
      const pb = landmarks[b]
      const x1 = mirror ? width - pa.x * width : pa.x * width
      const y1 = pa.y * height
      const x2 = mirror ? width - pb.x * width : pb.x * width
      const y2 = pb.y * height
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    })
    ctx.stroke()

    // Draw landmarks
    landmarks.forEach((lm, i) => {
      const x = mirror ? width - lm.x * width : lm.x * width
      const y = lm.y * height
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, 2 * Math.PI)
      ctx.fillStyle = i === 0 ? '#10b981' : '#2563eb'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1
      ctx.stroke()
    })
  }

  return (
    <div className="video-feed-container">
      <div className="video-wrapper">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted
          className="video-element"
          style={{ display: 'none' }}
        />
        <canvas ref={canvasRef} className="overlay-canvas" />
        
        {!isRunning && (
          <div className="video-placeholder">
            <div className="placeholder-icon">🤟</div>
            <p>Click "Start" to begin camera</p>
            <p className="placeholder-hint">Allow camera access when prompted</p>
          </div>
        )}
      </div>

      <div className="video-controls">
        <label className="mirror-toggle">
          <input 
            type="checkbox" 
            checked={mirror} 
            onChange={(e) => setMirror(e.target.checked)} 
          />
          Mirror view
        </label>
      </div>

      <div className="status-badges">
        <span className={`badge ${handStatus === 'ready' ? 'active' : ''}`}>
          Hand: {handStatus}
        </span>
        <span className={`badge ${classifierStatus === 'ready' ? 'active' : ''}`}>
          Model: {classifierStatus}
        </span>
      </div>
    </div>
  )
}