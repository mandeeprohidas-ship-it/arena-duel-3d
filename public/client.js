html, body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Arial, Helvetica, sans-serif;
  background: radial-gradient(circle at top, #0c1830, #03070d 68%);
  color: white;
}

canvas {
  display: block;
}

#hud {
  position: absolute;
  top: 18px;
  left: 18px;
  z-index: 10;
  pointer-events: none;
}

#title {
  font-size: clamp(1.5rem, 2vw, 2.5rem);
  font-weight: 800;
  letter-spacing: 0.14rem;
  text-shadow: 0 6px 22px rgba(0, 0, 0, 0.7);
}

#status,
#controls,
#scoreboard {
  margin-top: 12px;
  min-width: 220px;
  background: rgba(8, 14, 22, 0.42);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 12px;
  padding: 10px 12px;
  backdrop-filter: blur(12px);
  box-shadow: 0 10px 24px rgba(0,0,0,0.28);
}

#controls {
  line-height: 1.55;
}

#scoreboard {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.score-entry {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 0.95rem;
}
