import { useEffect, useRef } from "react";
import Human from '@vladmandic/human';

const human = new Human({
  cacheSensitivity: 0,
  debug: false,
  modelBasePath: '/models/',
  filter: { enabled: true },
  face: {
    enabled: true,
    detector: { rotation: false },
    mesh: { enabled: true },
    iris: { enabled: true },
    description: true,
    emotion: true,
    antispoof: true,
  },
});

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    async function init() {
      await human.load();
      await human.warmup();

      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play();
            detectLoop();
          };
        });
    }

    async function detectLoop() {
      const result = await human.detect(videoRef.current);

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      human.draw.canvas(videoRef.current, canvas);
      human.draw.all(canvas, result);

      requestAnimationFrame(detectLoop);
    }

    init();
  }, []);

  return (
    <div style={{ position: "relative" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          zIndex: 1,
        }}
      ></video>

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          zIndex: 2,
        }}
      />
    </div>
  );
}

export default App;
