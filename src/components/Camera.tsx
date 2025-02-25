import { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { useWasteStore } from '../store/wasteStore';
import { Camera as CaptureIcon, Loader2, Pause, Play, FlipHorizontal } from 'lucide-react';

export function Camera() {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<cocossd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const addDetection = useWasteStore((state) => state.addDetection);
  const detectInterval = useRef<number>();
  const clearDetections = useWasteStore((state) => state.clearDetections);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const [dimensions, setDimensions] = useState({
    width: Math.min(640, window.innerWidth - 32), // 32px for padding
    height: Math.min(480, (window.innerWidth - 32) * 0.75) // maintain 4:3 aspect ratio
  });

  // Add resize handler
  useEffect(() => {
    const handleResize = () => {
      const newWidth = Math.min(640, window.innerWidth - 32);
      setDimensions({
        width: newWidth,
        height: newWidth * 0.75 // maintain 4:3 aspect ratio
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load model on mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        await tf.ready();
        await tf.setBackend('webgl');
        const model = await cocossd.load({
          base: 'mobilenet_v2',
          modelUrl: undefined
        });
        setModel(model);
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load model:', error);
        setIsLoading(false);
      }
    };
    loadModel();

    return () => {
      if (detectInterval.current) {
        clearInterval(detectInterval.current);
      }
    };
  }, []);

  // Continuous detection function - only shows boxes, doesn't count during live preview
  const detectObjects = async () => {
    if (!model || !webcamRef.current?.video || !canvasRef.current) return;

    const video = webcamRef.current.video;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const predictions = await model.detect(video);
      
      // Filter out 'person' and keep only waste-relevant items
      const relevantPredictions = predictions.filter(prediction => {
        const wasteItems = [
          'bottle', 'cup', 'wine glass', 'fork', 'knife', 'spoon', 'bowl',
          'laptop', 'tv', 'cell phone', 'book', 'clock', 'vase', 'scissors',
          'keyboard', 'mouse', 'remote', 'microwave', 'oven', 'toaster',
          'refrigerator', 'paper', 'cardboard', 'box', 'can', 'battery',
          'monitor', 'computer', 'printer', 'phone'
        ];
        
        return prediction.class.toLowerCase() !== 'person' && 
               (wasteItems.some(item => 
                 prediction.class.toLowerCase().includes(item) ||
                 item.includes(prediction.class.toLowerCase())
               ));
      });

      canvas.width = dimensions.width;
      canvas.height = dimensions.height;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Only draw boxes for relevant items
      relevantPredictions.forEach((prediction) => {
        if (prediction.score > 0.5) {
          const [x, y, width, height] = prediction.bbox;

          ctx.strokeStyle = '#00FF00';
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y, width, height);

          const label = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
          ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
          ctx.fillRect(x, y - 20, ctx.measureText(label).width + 10, 20);
          ctx.fillStyle = '#000000';
          ctx.font = '16px Arial';
          ctx.fillText(label, x + 5, y - 5);
        }
      });
    } catch (error) {
      console.error('Detection error:', error);
    }
  };

  // Start continuous detection when video is ready
  useEffect(() => {
    if (!isLoading && model && webcamRef.current?.video && isLive) {
      const video = webcamRef.current.video;

      const startDetection = () => {
        // Run detection every 100ms
        detectInterval.current = window.setInterval(detectObjects, 100);
      };

      if (video.readyState === 4) {
        startDetection();
      } else {
        video.addEventListener('loadeddata', startDetection);
      }

      return () => {
        video.removeEventListener('loadeddata', startDetection);
        if (detectInterval.current) {
          clearInterval(detectInterval.current);
        }
      };
    }
  }, [isLoading, model, isLive]);

  const captureImage = () => {
    if (!webcamRef.current || !isLive) return;

    // Pause live detection
    setIsLive(false);
    if (detectInterval.current) {
      clearInterval(detectInterval.current);
    }

    // Take snapshot
    const imageSrc = webcamRef.current.getScreenshot();
    setSnapshot(imageSrc);

    // Run detection on snapshot and count items
    if (imageSrc) {
      const img = new Image();
      img.src = imageSrc;
      img.onload = async () => {
        if (!model || !canvasRef.current) return;
        
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const predictions = await model.detect(img);
        
        // Filter out 'person' and keep only waste-relevant items
        const relevantPredictions = predictions.filter(prediction => {
          const wasteItems = [
            'bottle', 'cup', 'wine glass', 'fork', 'knife', 'spoon', 'bowl',
            'laptop', 'tv', 'cell phone', 'book', 'clock', 'vase', 'scissors',
            'keyboard', 'mouse', 'remote', 'microwave', 'oven', 'toaster',
            'refrigerator', 'paper', 'cardboard', 'box', 'can', 'battery',
            'monitor', 'computer', 'printer', 'phone'
          ];
          
          return prediction.class.toLowerCase() !== 'person' && 
                 (wasteItems.some(item => 
                   prediction.class.toLowerCase().includes(item) ||
                   item.includes(prediction.class.toLowerCase())
                 ));
        });

        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Draw boxes and count items only after capture
        relevantPredictions.forEach((prediction) => {
          if (prediction.score > 0.5) {
            const [x, y, width, height] = prediction.bbox;
            
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, width, height);

            const label = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(x, y - 20, ctx.measureText(label).width + 10, 20);
            ctx.fillStyle = '#000000';
            ctx.font = '16px Arial';
            ctx.fillText(label, x + 5, y - 5);

            // Only add relevant items to store
            addDetection({
              type: prediction.class.toLowerCase(),
              timestamp: Date.now(),
              confidence: prediction.score
            });
          }
        });
      };
    }
  };

  const toggleLiveMode = () => {
    if (!isLive) {
      // Resume live detection
      setSnapshot(null);
      setIsLive(true);
      clearDetections();
      if (detectInterval.current) {
        clearInterval(detectInterval.current);
      }
      if (webcamRef.current?.video) {
        detectInterval.current = window.setInterval(detectObjects, 100);
      }
    } else {
      // Pause live detection
      setIsLive(false);
      if (detectInterval.current) {
        clearInterval(detectInterval.current);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(current => current === "environment" ? "user" : "environment");
  };

  return (
    <div className="relative w-full flex justify-center">
      <div 
        className="relative w-full max-w-[640px]"
        style={{
          aspectRatio: '4/3',
        }}
      >
        <Webcam
          ref={webcamRef}
          className="rounded-lg shadow-lg absolute top-0 left-0 w-full h-full object-cover"
          mirrored={facingMode === "user"}
          audio={false}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: dimensions.width,
            height: dimensions.height,
            facingMode: facingMode,
            aspectRatio: 4/3
          }}
          style={{
            display: snapshot ? 'none' : 'block',
          }}
        />
        {snapshot && (
          <img
            src={snapshot}
            alt="Captured waste"
            className="rounded-lg shadow-lg absolute top-0 left-0 w-full h-full object-cover"
          />
        )}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 rounded-lg w-full h-full"
        />
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <span className="ml-2 text-white text-sm sm:text-base">Loading AI model...</span>
          </div>
        ) : (
          <div className="absolute bottom-4 right-4 flex gap-2">
            <button
              onClick={toggleCamera}
              className="p-2 sm:p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              <FlipHorizontal className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
            </button>
            <button
              onClick={toggleLiveMode}
              className="p-2 sm:p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
            >
              {isLive ? (
                <Pause className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" />
              ) : (
                <Play className="w-5 h-5 sm:w-6 sm:h-6 text-green-500" />
              )}
            </button>
            <button
              onClick={captureImage}
              className="p-2 sm:p-3 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              disabled={!isLive}
            >
              <CaptureIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}