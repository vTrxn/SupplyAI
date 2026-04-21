// frontend/src/components/NetworkBackground.tsx
import { useEffect, useRef } from "react";

interface Props {
  accentColor: string;
}

export default function NetworkBackground({ accentColor }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    const mouse = { x: -1000, y: -1000 };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initNodes();
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    
    // Smooth reset when mouse leaves
    const handleMouseOut = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseout", handleMouseOut);

    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      baseAlpha: number;
    }

    let nodes: Node[] = [];
    const MAX_DISTANCE = 160;
    const MOUSE_RADIUS = 250;

    function initNodes() {
      nodes = [];
      const NUM_NODES = Math.floor((width * height) / 10000); // Responsive amount of nodes
      for (let i = 0; i < NUM_NODES; i++) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          radius: Math.random() * 1.5 + 0.5,
          baseAlpha: Math.random() * 0.5 + 0.1,
        });
      }
    }
    initNodes();

    let animationFrameId: number;

    // Helper to parse hex color to rgb
    function hexToRgb(hex: string) {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : "124, 110, 247";
    }
    
    const rgbAccent = hexToRgb(accentColor);

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Update positions
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off walls smoothly
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
      });

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < MAX_DISTANCE) {
            // Breathing effect based on mouse distance
            const midX = (nodes[i].x + nodes[j].x) / 2;
            const midY = (nodes[i].y + nodes[j].y) / 2;
            const mouseDx = midX - mouse.x;
            const mouseDy = midY - mouse.y;
            const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);

            let alpha = 1 - dist / MAX_DISTANCE;
            let intensity = alpha * 0.1; // Very low contrast base lines

            let strokeStyle = `rgba(180, 180, 220, ${intensity})`; // Dim geometrical lines

            if (mouseDist < MOUSE_RADIUS) {
               // Subtly illuminate paths with Main Accent Color dim variant
               const glow = (1 - mouseDist / MOUSE_RADIUS) * 0.6;
               strokeStyle = `rgba(${rgbAccent}, ${intensity + glow})`;
               ctx.lineWidth = 1.2;
            } else {
               ctx.lineWidth = 0.8;
            }

            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((node) => {
        const mouseDx = node.x - mouse.x;
        const mouseDy = node.y - mouse.y;
        const mouseDist = Math.sqrt(mouseDx * mouseDx + mouseDy * mouseDy);
        
        let alpha = node.baseAlpha * 0.3;
        let fillStyle = `rgba(180, 180, 220, ${alpha})`;

        let nodeRadius = node.radius;

        if (mouseDist < MOUSE_RADIUS) {
            const glow = (1 - mouseDist / MOUSE_RADIUS) * 0.8;
            fillStyle = `rgba(${rgbAccent}, ${alpha + glow})`;
            nodeRadius += (glow * 1.5);
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeRadius, 0, Math.PI * 2);
        ctx.fillStyle = fillStyle;
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(animate);
    }
    
    animate();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseout", handleMouseOut);
      cancelAnimationFrame(animationFrameId);
    };
  }, [accentColor]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 0,
        pointerEvents: "none",
        background: "transparent",
      }}
    />
  );
}
