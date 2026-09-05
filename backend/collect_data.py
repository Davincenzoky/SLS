#!/usr/bin/env python3
"""
Data collection utility for ASL training.
Run this script to collect hand landmark samples via webcam.
"""

import cv2
import mediapipe as mp
import json
import os
import time
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)

ASL_LABELS = [
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
    'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
    'SPACE', 'DELETE', 'NOTHING'
]

mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils

def collect_samples(label: str, num_samples: int = 100):
    """Collect samples for a specific label."""
    if label not in ASL_LABELS:
        print(f"Invalid label: {label}. Must be one of: {ASL_LABELS}")
        return
    
    label_dir = DATA_DIR / label
    label_dir.mkdir(exist_ok=True)
    
    existing = len(list(label_dir.glob("*.json")))
    print(f"Collecting {num_samples} samples for '{label}' (already have {existing})")
    
    cap = cv2.VideoCapture(0)
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.7,
        min_tracking_confidence=0.5
    )
    
    collected = 0
    last_capture = 0
    capture_interval = 0.1  # 100ms between captures
    
    print("Press SPACE to start/stop auto-capture, 'q' to quit")
    
    auto_capture = False
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        frame = cv2.flip(frame, 1)
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = hands.process(rgb)
        
        # Draw landmarks
        if results.multi_hand_landmarks:
            for hand_landmarks in results.multi_hand_landmarks:
                mp_drawing.draw_landmarks(
                    frame, hand_landmarks, mp_hands.HAND_CONNECTIONS
                )
                
                # Auto-capture
                if auto_capture and (time.time() - last_capture) > capture_interval:
                    landmarks = []
                    for lm in hand_landmarks.landmark:
                        landmarks.extend([lm.x, lm.y, lm.z])
                    
                    if len(landmarks) == 63:
                        sample_file = label_dir / f"sample_{existing + collected:04d}.json"
                        with open(sample_file, 'w') as f:
                            json.dump({"landmarks": landmarks, "label": label}, f)
                        collected += 1
                        last_capture = time.time()
                        print(f"  Collected {collected}/{num_samples}", end='\r')
                        
                        if collected >= num_samples:
                            print(f"\nDone! Collected {collected} samples for '{label}'")
                            auto_capture = False
        
        # Status overlay
        status = "AUTO" if auto_capture else "MANUAL"
        cv2.putText(frame, f"Label: {label} | Samples: {existing + collected} | Mode: {status}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, "SPACE: Toggle auto | Q: Quit", 
                   (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        cv2.imshow('ASL Data Collection', frame)
        
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        elif key == ord(' '):
            auto_capture = not auto_capture
            print(f"\nAuto-capture: {'ON' if auto_capture else 'OFF'}")
    
    cap.release()
    cv2.destroyAllWindows()

def main():
    import argparse
    parser = argparse.ArgumentParser(description='Collect ASL hand landmark data')
    parser.add_argument('label', choices=ASL_LABELS, help='Sign label to collect')
    parser.add_argument('-n', '--num', type=int, default=100, help='Number of samples')
    args = parser.parse_args()
    
    collect_samples(args.label, args.num)

if __name__ == '__main__':
    main()