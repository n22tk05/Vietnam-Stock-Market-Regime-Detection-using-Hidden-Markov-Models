import React, { useEffect, useRef } from 'react';

export const ShaderHeroCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationFrameId: number;

    function syncSize() {
      if (!canvas) return;
      const w = canvas.clientWidth || 1280;
      const h = canvas.clientHeight || 720;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    syncSize();

    const resizeObserver = new ResizeObserver(() => syncSize());
    resizeObserver.observe(canvas);

    const gl = canvas.getContext('webgl') || (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    if (!gl) return;

    const vsSource = `
      attribute vec2 a_position;
      varying vec2 v_texCoord;
      void main() {
        v_texCoord = a_position * 0.5 + 0.5;
        gl_Position = vec4(a_position, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_mouse;
      varying vec2 v_texCoord;

      void main() {
          vec2 uv = v_texCoord;
          vec2 center = vec2(0.5, 0.5);
          
          // Mouse interaction factor
          vec2 normMouse = u_mouse / u_resolution;
          vec2 mouseOffset = (normMouse - vec2(0.5)) * 0.2;
          
          // Abstract flowing blue waves/particles for "AI Thinking"
          float d = length(uv - (center + mouseOffset));
          float wave1 = sin(uv.x * 12.0 + u_time * 1.5) * cos(uv.y * 12.0 + u_time * 0.8);
          float wave2 = sin(uv.y * 18.0 - u_time * 1.2) * cos(uv.x * 18.0 + u_time * 1.1);
          float noise = wave1 * 0.6 + wave2 * 0.4;
          
          vec3 colorNavy = vec3(0.06, 0.10, 0.18);  // #0f172a Deep Navy
          vec3 colorRoyal = vec3(0.19, 0.42, 0.95); // #316bf3 Royal Blue
          vec3 colorCyan = vec3(0.0, 0.75, 0.95);   // AI Cyan accent
          
          float mixFactor = smoothstep(0.1, 0.95, d + noise * 0.15);
          vec3 finalColor = mix(colorRoyal, colorNavy, mixFactor);
          
          // Glowing pulses
          float pulse = sin(u_time * 2.5) * 0.5 + 0.5;
          float pulseCircle = (1.0 - smoothstep(0.0, 0.45, d)) * pulse;
          finalColor += mix(colorCyan, colorRoyal, pulse) * pulseCircle * 0.5;
          
          // Subtle grid/particle lines
          float grid = abs(sin(uv.x * 40.0) * sin(uv.y * 40.0));
          finalColor += vec3(0.05, 0.15, 0.35) * pow(grid, 10.0) * (1.0 - mixFactor);

          gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    function compileShader(type: number, src: string) {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = compileShader(gl.VERTEX_SHADER, vsSource);
    const fs = compileShader(gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return;
    }

    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width && rect.height) {
        const nx = (event.clientX - rect.left) / rect.width;
        const ny = 1.0 - (event.clientY - rect.top) / rect.height;
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    function render(t: number) {
      if (!gl || !canvas) return;
      syncSize();
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    }

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousemove', handleMouseMove);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden rounded-premium">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-black/10 pointer-events-none" />
      
      {/* Decorative Floating Overlay Elements */}
      <div className="absolute top-6 left-6 glass-card px-4 py-2 rounded-full flex items-center gap-2 text-white text-xs font-semibold backdrop-blur-md">
        <span className="w-2 h-2 rounded-full bg-[#009668] animate-ping" />
        <span className="w-2 h-2 rounded-full bg-[#009668]" />
        AI Engine Active • 50M+ Data Points/sec
      </div>
    </div>
  );
};
