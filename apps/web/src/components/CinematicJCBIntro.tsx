"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import * as THREE from "three";
import { ArrowRight, RotateCcw, HardHat } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * Procedural vector shapes for uppercase architectural lettering: "WELCOME TO".
 * Standing upright in 2D coordinates: bottom at y = 0, top at y = height.
 */
function createLetterShape(char: string, w = 0.72, h = 1.05): THREE.Shape {
  const shape = new THREE.Shape();
  const t = 0.17;

  switch (char) {
    case "W": {
      const sw = w / 4;
      shape.moveTo(0, h);
      shape.lineTo(sw * 0.7, 0);
      shape.lineTo(sw * 1.5, 0);
      shape.lineTo(sw * 2, h * 0.65);
      shape.lineTo(sw * 2.5, 0);
      shape.lineTo(sw * 3.3, 0);
      shape.lineTo(w, h);
      shape.lineTo(w - t, h);
      shape.lineTo(sw * 2.85, t * 1.2);
      shape.lineTo(sw * 2, h * 0.82);
      shape.lineTo(sw * 1.15, t * 1.2);
      shape.lineTo(t, h);
      shape.closePath();
      return shape;
    }

    case "E": {
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, t);
      shape.lineTo(t, t);
      shape.lineTo(t, (h - t) / 2);
      shape.lineTo(w * 0.78, (h - t) / 2);
      shape.lineTo(w * 0.78, (h + t) / 2);
      shape.lineTo(t, (h + t) / 2);
      shape.lineTo(t, h - t);
      shape.lineTo(w, h - t);
      shape.lineTo(w, h);
      shape.lineTo(0, h);
      shape.closePath();
      return shape;
    }

    case "L": {
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, t);
      shape.lineTo(t, t);
      shape.lineTo(t, h);
      shape.lineTo(0, h);
      shape.closePath();
      return shape;
    }

    case "C": {
      shape.moveTo(w, t * 1.2);
      shape.lineTo(w, 0);
      shape.lineTo(0, 0);
      shape.lineTo(0, h);
      shape.lineTo(w, h);
      shape.lineTo(w, h - t * 1.2);
      shape.lineTo(t, h - t * 1.2);
      shape.lineTo(t, t * 1.2);
      shape.closePath();
      return shape;
    }

    case "O": {
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(0, h);
      shape.closePath();

      const hole = new THREE.Path();
      hole.moveTo(t, t);
      hole.lineTo(t, h - t);
      hole.lineTo(w - t, h - t);
      hole.lineTo(w - t, t);
      hole.closePath();
      shape.holes.push(hole);
      return shape;
    }

    case "M": {
      shape.moveTo(0, 0);
      shape.lineTo(t, 0);
      shape.lineTo(t, h - t * 1.8);
      shape.lineTo(w / 2, t * 1.4);
      shape.lineTo(w - t, h - t * 1.8);
      shape.lineTo(w - t, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(w - t * 1.2, h);
      shape.lineTo(w / 2, h * 0.38);
      shape.lineTo(t * 1.2, h);
      shape.lineTo(0, h);
      shape.closePath();
      return shape;
    }

    case "T": {
      const stemX = (w - t) / 2;
      shape.moveTo(stemX, 0);
      shape.lineTo(stemX + t, 0);
      shape.lineTo(stemX + t, h - t);
      shape.lineTo(w, h - t);
      shape.lineTo(w, h);
      shape.lineTo(0, h);
      shape.lineTo(0, h - t);
      shape.lineTo(stemX, h - t);
      shape.closePath();
      return shape;
    }

    default: {
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(0, h);
      shape.closePath();
      return shape;
    }
  }
}

/**
 * Procedural ground texture with subtle architectural construction grid.
 */
function createGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#F5F2EC";
  ctx.fillRect(0, 0, 1024, 1024);

  // Minor grid lines
  ctx.strokeStyle = "#E8E2D7";
  ctx.lineWidth = 1.0;
  const step = 32;
  for (let x = 0; x <= 1024; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Major architectural modules
  ctx.strokeStyle = "#D6CDBC";
  ctx.lineWidth = 2.0;
  const majorStep = 128;
  for (let x = 0; x <= 1024; x += majorStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 1024);
    ctx.stroke();
  }
  for (let y = 0; y <= 1024; y += majorStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y);
    ctx.stroke();
  }

  // Coordinate ticks
  ctx.fillStyle = "#9C9283";
  ctx.font = "bold 13px 'Courier New', monospace";
  for (let x = majorStep; x < 1024; x += majorStep * 2) {
    for (let y = majorStep; y < 1024; y += majorStep * 2) {
      ctx.fillText(`+${Math.round(x / 10)}`, x + 6, y - 6);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  return texture;
}

/**
 * Creates soft radial contact shadow texture for under-chassis grounding.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(256, 128, 20, 256, 128, 120);
  grad.addColorStop(0, "rgba(20, 24, 30, 0.65)");
  grad.addColorStop(0.5, "rgba(20, 24, 30, 0.32)");
  grad.addColorStop(1, "rgba(20, 24, 30, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 256);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

interface CinematicJCBIntroProps {
  onComplete?: () => void;
  canSkip?: boolean;
}

export function CinematicJCBIntro({ onComplete, canSkip = true }: CinematicJCBIntroProps) {
  const router = useRouter();
  const { session } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<"running" | "completed">("running");
  const [hasWebGLError, setHasWebGLError] = useState(false);

  const animationResetRef = useRef<(() => void) | null>(null);

  const handleFinish = useCallback(() => {
    if (onComplete) {
      onComplete();
    } else {
      if (session) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [onComplete, session, router]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    const testCanvas = document.createElement("canvas");
    const gl = testCanvas.getContext("webgl") || testCanvas.getContext("experimental-webgl");
    if (!gl) {
      setHasWebGLError(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Three.js Scene Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF6F3EE);
    scene.fog = new THREE.FogExp2(0xF6F3EE, 0.012);

    // 2. Camera Setup: Elevated 3/4 architectural viewpoint
    const isMobile = width < 768;
    const camera = new THREE.PerspectiveCamera(isMobile ? 50 : 38, width / height, 0.1, 120);
    camera.position.set(0.6, isMobile ? 4.2 : 3.8, isMobile ? 15.8 : 13.6);
    camera.lookAt(0.6, 1.25, 0);

    // 3. Renderer Setup with Physically Correct Lighting & Shadows
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);

    // 4. Lighting System
    const hemiLight = new THREE.HemisphereLight(0xFFFAF0, 0xD4CEBE, 0.7);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xFFF6E6, 1.7);
    sunLight.position.set(16, 22, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 60;
    sunLight.shadow.camera.left = -22;
    sunLight.shadow.camera.right = 22;
    sunLight.shadow.camera.top = 16;
    sunLight.shadow.camera.bottom = -16;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xD6E4F0, 0.45);
    fillLight.position.set(-14, 10, -10);
    scene.add(fillLight);

    // 5. Ground Plane with Architectural Grid
    const groundTexture = createGroundTexture();
    const groundGeom = new THREE.PlaneGeometry(160, 160);
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.88,
      metalness: 0.05,
    });
    const ground = new THREE.Mesh(groundGeom, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // 6. Dynamic Clipping Plane for Position-Synchronized Reveal
    const clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -25);

    // 7. Freestanding Upright 3D Letters: "WELCOME TO"
    const textGroup = new THREE.Group();
    scene.add(textGroup);

    const letterMaterial = new THREE.MeshStandardMaterial({
      color: 0x102F57, // Anumaan Signature Navy
      roughness: 0.28,
      metalness: 0.35,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.26,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelOffset: 0,
      bevelSegments: 3,
    };

    const letterSpacings: { char: string; width: number; spacing: number }[] = [
      { char: "W", width: 0.96, spacing: 0.18 },
      { char: "E", width: 0.65, spacing: 0.18 },
      { char: "L", width: 0.62, spacing: 0.18 },
      { char: "C", width: 0.72, spacing: 0.18 },
      { char: "O", width: 0.76, spacing: 0.18 },
      { char: "M", width: 0.94, spacing: 0.18 },
      { char: "E", width: 0.65, spacing: 0.8 }, // Gap between "WELCOME" and "TO"
      { char: "T", width: 0.72, spacing: 0.18 },
      { char: "O", width: 0.76, spacing: 2.0 }, // Generous 2.0m gap before Anumaan Logo
    ];

    let currentCursorX = -8.6;

    letterSpacings.forEach(({ char, width: charW, spacing }) => {
      const shape = createLetterShape(char, charW, 1.25);
      const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      const mesh = new THREE.Mesh(geom, letterMaterial);
      mesh.position.set(currentCursorX, 0, -0.4);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      textGroup.add(mesh);
      currentCursorX += charW + spacing;
    });

    // 8. Official Complete Anumaan Brand Logo Presentation (Clean Transparent Cutout on Dark Plinth)
    const logoGroup = new THREE.Group();
    scene.add(logoGroup);

    const textureLoader = new THREE.TextureLoader();
    const logoTexture = textureLoader.load("/assets/anumaan-logo-transparent.png", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      renderer.render(scene, camera);
    });

    const logoWidth = 4.8;
    const logoHeight = 2.4;
    const logoStartX = 1.15; // Generous 2.0m spacing after "TO"
    const logoCenterX = logoStartX + logoWidth / 2; // +3.55
    const logoCenterY = logoHeight / 2 + 0.05;

    // Clean, elegant low architectural ground plinth (dark granite runner at base)
    const plinthGeom = new THREE.BoxGeometry(logoWidth + 0.2, 0.08, 0.3);
    const plinthMat = new THREE.MeshStandardMaterial({
      color: 0x1A222E,
      roughness: 0.5,
      metalness: 0.3,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });
    const plinth = new THREE.Mesh(plinthGeom, plinthMat);
    plinth.position.set(logoCenterX, 0.04, -0.4);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    logoGroup.add(plinth);

    // Official Anumaan Logo Artwork Quad standing directly on the plinth with transparent background!
    const logoFaceMat = new THREE.MeshStandardMaterial({
      map: logoTexture,
      transparent: true,
      alphaTest: 0.04,
      roughness: 0.3,
      metalness: 0.1,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
      side: THREE.DoubleSide,
    });
    const logoPlaneGeom = new THREE.PlaneGeometry(logoWidth, logoHeight);
    const logoMesh = new THREE.Mesh(logoPlaneGeom, logoFaceMat);
    logoMesh.position.set(logoCenterX, logoCenterY, -0.38);
    logoMesh.castShadow = true;
    logoGroup.add(logoMesh);

    // 9. Replaced JCB Backhoe Loader (Using the User's Provided Exact Reference Asset)
    const jcbGroup = new THREE.Group();
    scene.add(jcbGroup);

    const jcbTexture = textureLoader.load("/assets/jcb-loader-right.png", (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.generateMipmaps = true;
      renderer.render(scene, camera);
    });

    const jcbHeight = 3.25;
    const jcbWidth = jcbHeight * (600 / 275); // approx 7.09m

    // Soft Radial Ground Contact Shadow Patch below the wheels
    const shadowTex = createContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(jcbWidth * 1.05, 2.6), shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0, 0.015, 0);
    jcbGroup.add(shadowPlane);

    // High-Resolution Transparent JCB Quad (Standing grounded at Y = 0)
    const jcbMat = new THREE.MeshStandardMaterial({
      map: jcbTexture,
      transparent: true,
      alphaTest: 0.04,
      roughness: 0.38,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });
    const jcbGeom = new THREE.PlaneGeometry(jcbWidth, jcbHeight);
    const jcbMesh = new THREE.Mesh(jcbGeom, jcbMat);
    jcbMesh.position.set(0, jcbHeight / 2, 0);
    jcbMesh.castShadow = true;
    jcbGroup.add(jcbMesh);

    jcbGroup.position.z = 0.85;

    // 10. Subtle Ground Dust Particles
    const particleCount = 120;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities: { x: number; y: number; z: number; life: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = -50;
      particlePositions[i * 3 + 1] = -10;
      particlePositions[i * 3 + 2] = 0;
      particleVelocities.push({ x: 0, y: 0, z: 0, life: 0 });
    }
    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xD8CABB,
      size: 0.18,
      transparent: true,
      opacity: 0.5,
    });
    const dustPoints = new THREE.Points(particleGeom, particleMat);
    scene.add(dustPoints);

    // 11. Animation Timing & Path
    let startTime = performance.now();
    let isRunning = true;
    let animId: number;

    const startX = -14.5;
    const stopX = 10.2;
    const travelDistance = stopX - startX;
    const travelDuration = 5600;
    let prevJcbX = startX;

    const resetAnimation = () => {
      startTime = performance.now();
      prevJcbX = startX;
      setPhase("running");
      clippingPlane.constant = -25;
    };
    animationResetRef.current = resetAnimation;

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);

      const elapsed = now - startTime;
      const tNorm = Math.min(elapsed / travelDuration, 1.0);

      // Smooth custom acceleration and deceleration easing
      const easedT = tNorm < 0.82
        ? (tNorm / 0.82) * 0.82
        : 0.82 + Math.sin(((tNorm - 0.82) / 0.18) * (Math.PI / 2)) * 0.18;

      const currentJcbX = startX + travelDistance * easedT;
      const deltaX = currentJcbX - prevJcbX;
      prevJcbX = currentJcbX;

      // Position vehicle
      jcbGroup.position.x = currentJcbX;

      // Realistic suspension heave & engine idling vibration
      if (tNorm < 1.0) {
        jcbMesh.position.y = (jcbHeight / 2) + Math.sin(elapsed * 0.016) * 0.032;
        jcbMesh.rotation.z = Math.sin(elapsed * 0.013) * 0.012;
      } else {
        jcbMesh.position.y = (jcbHeight / 2) + Math.sin(elapsed * 0.02) * 0.008;
        jcbMesh.rotation.z = 0;
      }

      // Live Position-Synchronized Reveal:
      // The rear edge of the JCB backhoe is at currentJcbX - (jcbWidth / 2 - 0.3) = currentJcbX - 3.25.
      // Progressively reveals "WELCOME TO" and then the complete Anumaan brand logo!
      const printThreshold = currentJcbX - 3.25;
      clippingPlane.constant = printThreshold;

      // Dust particles (active only while moving)
      if (tNorm < 0.98 && Math.abs(deltaX) > 0.001) {
        const positions = particleGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          if (particleVelocities[i].life <= 0 && Math.random() < 0.28) {
            positions[i * 3] = currentJcbX - 1.2 + (Math.random() - 0.5) * 0.8;
            positions[i * 3 + 1] = 0.05 + Math.random() * 0.12;
            positions[i * 3 + 2] = 0.85 + (Math.random() - 0.5) * 1.8;

            particleVelocities[i] = {
              x: -0.012 - Math.random() * 0.018,
              y: 0.012 + Math.random() * 0.018,
              z: (Math.random() - 0.5) * 0.016,
              life: 1.0,
            };
          } else if (particleVelocities[i].life > 0) {
            positions[i * 3] += particleVelocities[i].x;
            positions[i * 3 + 1] += particleVelocities[i].y;
            positions[i * 3 + 2] += particleVelocities[i].z;
            particleVelocities[i].life -= 0.025;
            if (particleVelocities[i].life <= 0) {
              positions[i * 3 + 1] = -10;
            }
          }
        }
        particleGeom.attributes.position.needsUpdate = true;
      }

      // Check completion
      if (tNorm >= 1.0 && isRunning) {
        isRunning = false;
        setPhase("completed");
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    // Responsive resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const mobile = w < 768;
      camera.aspect = w / h;
      camera.fov = mobile ? 50 : 38;
      camera.position.set(0.6, mobile ? 4.2 : 3.8, mobile ? 15.8 : 13.6);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // ESC shortcut to skip
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && canSkip) {
        handleFinish();
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("keydown", handleKeyDown);
      renderer.dispose();
      groundGeom.dispose();
      groundMaterial.dispose();
      particleGeom.dispose();
      particleMat.dispose();
      logoTexture.dispose();
      jcbTexture.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [canSkip, handleFinish]);

  // Graceful 2D Fallback for environments without WebGL
  if (hasWebGLError) {
    return (
      <div className="relative w-full h-screen bg-[#F6F3EE] flex flex-col items-center justify-center p-6 text-center font-devanagari">
        <div className="max-w-md bg-white border border-[#DCE4EE] p-8 rounded-2xl shadow-xl space-y-4">
          <div className="flex justify-center">
            <Image
              src="/assets/anumaan-logo.png"
              alt="Anumaan Logo"
              width={180}
              height={90}
              className="h-16 w-auto object-contain"
              priority
            />
          </div>
          <h2 className="text-xl font-bold text-[#102F57]">
            WELCOME TO ANUMAAN
          </h2>
          <p className="text-sm font-semibold text-[#F7931E]">
            मिनटों में पूरा अनुमान।
          </p>
          <p className="text-xs text-[#64748B]">
            AI-Assisted Construction Estimation & Civil Engineering Platform
          </p>
          <button
            onClick={handleFinish}
            className="w-full py-3 bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] rounded-xl text-sm font-bold shadow-md transition"
          >
            Explore Anumaan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#F6F3EE] select-none">
      {/* Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Top Header Controls (Unobtrusive) */}
      <header className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-3 bg-white/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[#DCE4EE] shadow-sm pointer-events-auto">
          <Image
            src="/assets/anumaan-logo.png"
            alt="Anumaan Logo"
            width={120}
            height={36}
            className="h-7 w-auto object-contain"
            priority
          />
          <span className="hidden sm:inline-block text-[11px] font-bold text-[#F7931E] border-l border-[#DCE4EE] pl-3 font-devanagari">
            मिनटों में पूरा अनुमान।
          </span>
        </div>

        {canSkip && (
          <button
            onClick={handleFinish}
            className="pointer-events-auto px-4 py-2 bg-white/90 hover:bg-white text-[#102F57] rounded-xl text-xs font-bold border border-[#DCE4EE] shadow-sm hover:shadow transition flex items-center gap-1.5"
          >
            <span>Skip Intro</span>
            <kbd className="hidden sm:inline-block text-[10px] bg-[#E8EEF5] text-[#64748B] px-1.5 py-0.5 rounded font-mono">
              ESC
            </kbd>
          </button>
        )}
      </header>

      {/* Sleek Non-Obtrusive Floating Dock (Revealed once JCB finishes, leaving the 3D scene fully visible!) */}
      {phase === "completed" && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center px-4 z-30 pointer-events-none animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-white/95 backdrop-blur-xl border border-[#DCE4EE] px-5 py-3.5 rounded-2xl shadow-2xl pointer-events-auto max-w-xl w-full justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-[#FFF6EB] flex items-center justify-center border border-[#FED7AA] shrink-0">
                <HardHat className="w-5 h-5 text-[#F59E00]" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#102F57] tracking-tight">
                  अनुमान (Anumaan) Civil Estimation
                </div>
                <div className="text-[10px] text-[#64748B] font-devanagari">
                  मिनटों में पूरा अनुमान। • MoRTH & IS Standard Takeoff
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => animationResetRef.current?.()}
                className="px-3 py-2 rounded-xl border border-[#DCE4EE] hover:bg-[#F6F8FB] text-[#64748B] hover:text-[#102F57] text-xs font-semibold flex items-center gap-1.5 transition"
                title="Replay 3D Intro"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Replay</span>
              </button>

              <button
                onClick={handleFinish}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#F59E00] to-[#E28500] hover:from-[#E28500] hover:to-[#C97100] text-[#102F57] font-bold text-xs shadow-md hover:shadow-lg transition flex items-center gap-2 group"
              >
                <span>Enter Platform</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
