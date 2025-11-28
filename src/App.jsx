// src/App.jsx
import { useEffect, useRef } from "react";
import Human from "@vladmandic/human";
import "./App.css";

const human = new Human({
  backend: "webgl",
  modelBasePath: "/models/",
  cacheModels: false,
  face: {
    enabled: true,
    detector: { rotation: false },
    mesh: { enabled: true },
    iris: false,
    description: false,
    emotion: false,
  },
  hand: { enabled: false },
});

export default function App() {
  const videoRef = useRef(null);
  const videoCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const maskRef = useRef(null);

  useEffect(() => {
    const mask = new Image();
    mask.crossOrigin = "anonymous";
    mask.src = "/masks/cat_mask.png";
    maskRef.current = null;

    mask.onload = () => {
      console.log("MASK LOADED:", mask.naturalWidth, mask.naturalHeight);
      maskRef.current = mask;
      initAndStart();
    };

    mask.onerror = () => {
      console.error("MASK FAILED TO LOAD:", mask.src);
      maskRef.current = null;
      initAndStart();
    };

    async function initAndStart() {
      try {
        if (human.tf && human.tf.ready) await human.tf.ready();
        await human.load();
        await human.warmup();

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          detectLoop();
        };
      } catch (err) {
        console.error("Init error:", err);
      }
    }

    async function detectLoop() {
      try {
        const video = videoRef.current;
        if (!video || video.readyState < 2) {
          requestAnimationFrame(detectLoop);
          return;
        }

        const result = await human.detect(video);

        // === Видео canvas ===
        const videoCanvas = videoCanvasRef.current;
        const vCtx = videoCanvas.getContext("2d");
        videoCanvas.width = video.videoWidth;
        videoCanvas.height = video.videoHeight;
        vCtx.clearRect(0, 0, videoCanvas.width, videoCanvas.height);
        vCtx.drawImage(video, 0, 0, videoCanvas.width, videoCanvas.height);

        // === Маска canvas ===
        const maskCanvas = maskCanvasRef.current;
        const mCtx = maskCanvas.getContext("2d");
        maskCanvas.width = video.videoWidth;
        maskCanvas.height = video.videoHeight;
        mCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

        if (result.face && result.face.length > 0 && maskRef.current) {
          result.face.forEach((face) => {
            if (!face.mesh) return;

            const mesh = face.mesh;
            const leftEye = mesh[33];
            const rightEye = mesh[263];
            const nose = mesh[1];

            const cx = (leftEye[0] + rightEye[0]) / 2;
            const cy = (leftEye[1] + rightEye[1]) / 2;
            const angle = Math.atan2(rightEye[1] - leftEye[1], rightEye[0] - leftEye[0]);
            const eyeDist = Math.hypot(rightEye[0] - leftEye[0], rightEye[1] - leftEye[1]);

            const maskWidth = eyeDist * 2.8;
            const maskHeight = maskWidth * (maskRef.current.naturalHeight / maskRef.current.naturalWidth);
            const yOffset = (nose[1] - cy) * 0.9;

            mCtx.save();
            mCtx.translate(cx, cy + yOffset);
            mCtx.rotate(angle);
            mCtx.drawImage(maskRef.current, -maskWidth / 2, -maskHeight / 2, maskWidth, maskHeight);
            mCtx.restore();
          });
        }

        requestAnimationFrame(detectLoop);
      } catch (err) {
        console.error("Detect loop error:", err);
        requestAnimationFrame(detectLoop);
      }
    }

    return () => {
      try {
        human.cancel();
      } catch (e) {}
    };
  }, []);

  // Функция для скачивания маски с прозрачным фоном
  const downloadMask = () => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const link = document.createElement("a");
    link.download = "mask.png";
    link.href = maskCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div style={{ position: "relative", width: 640, height: 480 }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ display: "none" }}
      />
      <canvas
        ref={videoCanvasRef}
        style={{
          position: "absolute",
          width: 640,
          height: 480,
          left: 0,
          top: 0,
          zIndex: 1,
          background: "transparent",
        }}
      />
      <canvas
        ref={maskCanvasRef}
        style={{
          position: "absolute",
          width: 640,
          height: 480,
          left: 0,
          top: 0,
          zIndex: 2,
          background: "transparent",
        }}
      />
      <button
        onClick={downloadMask}
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 3,
          padding: "5px 10px",
          fontSize: 16,
        }}
      >
        Скачать маску PNG
      </button>
    </div>
  );
}
