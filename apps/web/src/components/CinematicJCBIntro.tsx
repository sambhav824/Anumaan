"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import * as THREE from "three";
import { ArrowRight, RotateCcw, Play, Sparkles, Building2, HardHat, FileSpreadsheet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * Procedural letter shape generator for clean, offline-reliable 3D text.
 * Generates uppercase letter 2D vector shapes with outer path and inner holes.
 */
function createLetterShape(char: string, w = 0.8, h = 1.0): THREE.Shape {
  const shape = new THREE.Shape();
  const t = 0.18; // Stroke thickness

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
      shape.lineTo(sw * 2.8, t * 1.2);
      shape.lineTo(sw * 2, h * 0.85);
      shape.lineTo(sw * 1.2, t * 1.2);
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
      shape.lineTo(w * 0.75, (h - t) / 2);
      shape.lineTo(w * 0.75, (h + t) / 2);
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
      // Outer rect
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(0, h);
      shape.closePath();
      // Inner hole
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
      shape.lineTo(w / 2, t * 1.5);
      shape.lineTo(w - t, h - t * 1.8);
      shape.lineTo(w - t, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(w - t * 1.2, h);
      shape.lineTo(w / 2, h * 0.35);
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

    case "A": {
      shape.moveTo(0, 0);
      shape.lineTo(w * 0.35, h);
      shape.lineTo(w * 0.65, h);
      shape.lineTo(w, 0);
      shape.lineTo(w - t, 0);
      shape.lineTo(w * 0.72, h * 0.4);
      shape.lineTo(w * 0.28, h * 0.4);
      shape.lineTo(t, 0);
      shape.closePath();

      // Inner triangle hole
      const holeA = new THREE.Path();
      holeA.moveTo(w * 0.35, h * 0.55);
      holeA.lineTo(w * 0.5, h * 0.85);
      holeA.lineTo(w * 0.65, h * 0.55);
      holeA.closePath();
      shape.holes.push(holeA);
      return shape;
    }

    case "N": {
      shape.moveTo(0, 0);
      shape.lineTo(t, 0);
      shape.lineTo(w - t * 1.2, h - t * 1.5);
      shape.lineTo(w - t * 1.2, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(w - t, h);
      shape.lineTo(t * 1.2, t * 1.5);
      shape.lineTo(t * 1.2, h);
      shape.lineTo(0, h);
      shape.closePath();
      return shape;
    }

    case "U": {
      shape.moveTo(0, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(w - t, h);
      shape.lineTo(w - t, t);
      shape.lineTo(t, t);
      shape.lineTo(t, h);
      shape.lineTo(0, h);
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
 * Generates procedural canvas texture for the ground architectural grid.
 */
function createGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  // Warm light beige base
  ctx.fillStyle = "#F6F3EE";
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle minor grid
  ctx.strokeStyle = "#E8E2D8";
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

  // Major architectural grid lines
  ctx.strokeStyle = "#D9D0C3";
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

  // Engineering crosshairs and coordinate markers
  ctx.fillStyle = "#A89F91";
  ctx.font = "bold 14px 'Courier New', monospace";
  for (let x = majorStep; x < 1024; x += majorStep * 2) {
    for (let y = majorStep; y < 1024; y += majorStep * 2) {
      ctx.fillText(`+`, x - 4, y + 5);
      ctx.font = "9px 'Courier New', monospace";
      ctx.fillText(`${(x / 64).toFixed(1)}m`, x + 8, y + 12);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 4);
  return texture;
}

/**
 * Creates high-detail procedural 3D JCB backhoe loader mesh group.
 */
function createJCBGroup() {
  const jcb = new THREE.Group();

  // Materials
  const jcbYellow = new THREE.MeshStandardMaterial({
    color: 0xF5B000,
    roughness: 0.35,
    metalness: 0.2,
  });
  const darkMetal = new THREE.MeshStandardMaterial({
    color: 0x1E242C,
    roughness: 0.6,
    metalness: 0.5,
  });
  const chromeMetal = new THREE.MeshStandardMaterial({
    color: 0xE8ECEF,
    roughness: 0.1,
    metalness: 0.95,
  });
  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x18181A,
    roughness: 0.85,
    metalness: 0.1,
  });
  const cabGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1A2536,
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
    metalness: 0.8,
    transmission: 0.5,
  });

  // 1. Main Chassis & Lower Body
  const chassisGeom = new THREE.BoxGeometry(3.4, 0.7, 1.6);
  const chassis = new THREE.Mesh(chassisGeom, darkMetal);
  chassis.position.set(0, 0.95, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  jcb.add(chassis);

  // 2. Front Engine Bonnet / Hood
  const hoodGeom = new THREE.BoxGeometry(1.6, 0.75, 1.45);
  const hood = new THREE.Mesh(hoodGeom, jcbYellow);
  hood.position.set(0.95, 1.4, 0);
  hood.castShadow = true;
  jcb.add(hood);

  // Front Radiator Grille
  const grilleGeom = new THREE.BoxGeometry(0.08, 0.55, 1.3);
  const grille = new THREE.Mesh(grilleGeom, darkMetal);
  grille.position.set(1.78, 1.35, 0);
  jcb.add(grille);

  // Front Dual Headlights (Glow)
  const headlightMat = new THREE.MeshStandardMaterial({
    color: 0xFFF5DD,
    emissive: 0xFFE082,
    emissiveIntensity: 1.5,
  });
  const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.22), headlightMat);
  hlLeft.position.set(1.77, 1.45, 0.45);
  const hlRight = hlLeft.clone();
  hlRight.position.set(1.77, 1.45, -0.45);
  jcb.add(hlLeft, hlRight);

  // 3. Operator Cabin
  const cabWidth = 1.35;
  const cabLength = 1.4;
  const cabHeight = 1.45;
  const cabY = 1.35 + cabHeight / 2;

  // Glass Box
  const glassGeom = new THREE.BoxGeometry(cabLength - 0.05, cabHeight - 0.05, cabWidth - 0.05);
  const cabWindows = new THREE.Mesh(glassGeom, cabGlass);
  cabWindows.position.set(-0.55, cabY, 0);
  jcb.add(cabWindows);

  // ROPS Roll Cage Pillars
  const pillarGeom = new THREE.CylinderGeometry(0.04, 0.04, cabHeight, 8);
  const pillarPositions = [
    [-0.55 + cabLength / 2, cabY, cabWidth / 2],
    [-0.55 + cabLength / 2, cabY, -cabWidth / 2],
    [-0.55 - cabLength / 2, cabY, cabWidth / 2],
    [-0.55 - cabLength / 2, cabY, -cabWidth / 2],
  ];
  pillarPositions.forEach(([px, py, pz]) => {
    const pillar = new THREE.Mesh(pillarGeom, darkMetal);
    pillar.position.set(px, py, pz);
    jcb.add(pillar);
  });

  // Cab Roof Canopy
  const roofGeom = new THREE.BoxGeometry(cabLength + 0.2, 0.12, cabWidth + 0.2);
  const roof = new THREE.Mesh(roofGeom, jcbYellow);
  roof.position.set(-0.55, cabY + cabHeight / 2 + 0.06, 0);
  roof.castShadow = true;
  jcb.add(roof);

  // Amber Rotating Warning Beacon
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xF59E0B,
    emissive: 0xD97706,
    emissiveIntensity: 2.0,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.18, 12), beaconMat);
  beacon.position.set(-0.55, cabY + cabHeight / 2 + 0.2, 0.35);
  jcb.add(beacon);

  // Vertical Exhaust Pipe with Flap
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 10), darkMetal);
  exhaust.position.set(0.35, 2.05, 0.65);
  const exhaustCap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.1), chromeMetal);
  exhaustCap.position.set(0.35, 2.72, 0.65);
  exhaustCap.rotation.z = 0.35;
  jcb.add(exhaust, exhaustCap);

  // 4. Front Loader Arms and Bucket
  const loaderArmGroup = new THREE.Group();
  const armGeom = new THREE.BoxGeometry(1.6, 0.14, 0.12);
  const armLeft = new THREE.Mesh(armGeom, jcbYellow);
  armLeft.position.set(2.0, 1.05, 0.75);
  armLeft.rotation.z = -0.32;
  const armRight = armLeft.clone();
  armRight.position.z = -0.75;

  // Front Loader Bucket
  const bucketGeom = new THREE.BoxGeometry(0.65, 0.7, 1.9);
  const bucket = new THREE.Mesh(bucketGeom, jcbYellow);
  bucket.position.set(2.8, 0.6, 0);
  bucket.rotation.z = 0.15;
  bucket.castShadow = true;

  // Bucket Digging Teeth
  const toothMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.3 });
  for (let z = -0.8; z <= 0.85; z += 0.32) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 4), toothMat);
    tooth.rotation.z = -Math.PI / 2 + 0.15;
    tooth.position.set(3.14, 0.32, z);
    loaderArmGroup.add(tooth);
  }

  // Hydraulic Cylinders
  const cylGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.9, 10);
  const rodGeom = new THREE.CylinderGeometry(0.025, 0.025, 0.8, 10);
  const cylLeft = new THREE.Mesh(cylGeom, darkMetal);
  cylLeft.position.set(1.4, 1.25, 0.65);
  cylLeft.rotation.z = 1.1;
  const rodLeft = new THREE.Mesh(rodGeom, chromeMetal);
  rodLeft.position.set(1.75, 1.05, 0.65);
  rodLeft.rotation.z = 1.1;

  loaderArmGroup.add(armLeft, armRight, bucket, cylLeft, rodLeft);
  jcb.add(loaderArmGroup);

  // 5. Rear Excavator Backhoe Arm (Folded in Roading Position)
  const backhoeGroup = new THREE.Group();
  backhoeGroup.position.set(-1.7, 1.1, 0);

  // Kingpost Swivel Base
  const kingpost = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.6, 0.5), darkMetal);
  backhoeGroup.add(kingpost);

  // Boom (Heavy curved yellow arm)
  const boom = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 0.18), jcbYellow);
  boom.position.set(-0.6, 0.65, 0);
  boom.rotation.z = 0.85;

  // Dipper (arm folded down)
  const dipper = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.14), jcbYellow);
  dipper.position.set(-1.15, 0.85, 0);
  dipper.rotation.z = -1.2;

  // Backhoe Digging Bucket
  const backhoeBucket = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.4), darkMetal);
  backhoeBucket.position.set(-1.3, 0.35, 0);
  backhoeBucket.rotation.z = 0.4;

  backhoeGroup.add(boom, dipper, backhoeBucket);
  jcb.add(backhoeGroup);

  // 6. Wheels (Front and Rear with active rotation)
  const wheels: { mesh: THREE.Group; radius: number }[] = [];

  // Front Wheel Generator (smaller steering wheels)
  const makeFrontWheel = (z: number) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.35, 20), tireRubber);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.36, 16), jcbYellow);
    rim.rotation.x = Math.PI / 2;

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.38, 8), darkMetal);
    hub.rotation.x = Math.PI / 2;

    wg.add(tire, rim, hub);
    wg.position.set(1.15, 0.44, z);
    jcb.add(wg);
    wheels.push({ mesh: wg, radius: 0.44 });
  };

  // Rear Wheel Generator (giant heavy tractor wheels with chevron tread lugs)
  const makeRearWheel = (z: number) => {
    const wg = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.52, 24), tireRubber);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.54, 20), jcbYellow);
    rim.rotation.x = Math.PI / 2;

    const planetary = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.58, 10), darkMetal);
    planetary.rotation.x = Math.PI / 2;

    wg.add(tire, rim, planetary);
    wg.position.set(-0.95, 0.74, z);
    jcb.add(wg);
    wheels.push({ mesh: wg, radius: 0.74 });
  };

  makeFrontWheel(0.92);
  makeFrontWheel(-0.92);
  makeRearWheel(0.98);
  makeRearWheel(-0.98);

  return { jcb, wheels, beacon };
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
  const [printProgress, setPrintProgress] = useState(0);
  const [hasWebGLError, setHasWebGLError] = useState(false);

  // Animation reset handle
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
    const canvasTest = document.createElement("canvas");
    const gl = canvasTest.getContext("webgl") || canvasTest.getContext("experimental-webgl");
    if (!gl) {
      console.warn("WebGL not supported; falling back gracefully.");
      setHasWebGLError(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F6F3EE");
    scene.fog = new THREE.FogExp2(0xF6F3EE, 0.016);

    // 2. Camera setup - Three-quarter elevated architectural viewpoint
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 150);
    camera.position.set(-4.0, 5.2, 14.5);
    camera.lookAt(0, 0.8, 0);

    // 3. Renderer with local clipping enabled for position-synchronized reveal
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.localClippingEnabled = true;
    container.appendChild(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFBF0, 0.85);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xFFF4D4, 1.4);
    sunLight.position.set(12, 18, 14);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 45;
    sunLight.shadow.camera.left = -16;
    sunLight.shadow.camera.right = 16;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.bias = -0.0004;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xCCE3F5, 0.45);
    fillLight.position.set(-10, 8, -10);
    scene.add(fillLight);

    // 5. Ground Plane with Architectural Grid Texture
    const groundTexture = createGroundTexture();
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.85,
      metalness: 0.05,
    });
    const groundGeom = new THREE.PlaneGeometry(70, 45);
    const ground = new THREE.Mesh(groundGeom, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // 6. Dynamic Clipping Plane for Text Reveal
    // Normal (-1, 0, 0): any letter geometry with X > plane.constant is clipped (hidden).
    // As JCB moves in +X, plane.constant tracks the print head directly behind the JCB!
    const clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -20);

    // 7. 3D Architectural Text "WELCOME TO ANUMAAN"
    const textGroup = new THREE.Group();
    scene.add(textGroup);

    const words = [
      { text: "WELCOME", startX: -9.8 },
      { text: "TO", startX: -1.8 },
      { text: "ANUMAAN", startX: 1.2 },
    ];

    const letterDepth = 0.32;
    const letterHeight = 1.2;
    const letterWidth = 0.85;
    const letterSpacing = 0.22;

    const letterMat = new THREE.MeshStandardMaterial({
      color: 0x1A2332, // Deep architectural charcoal/stone
      roughness: 0.55,
      metalness: 0.2,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });

    const letterMeshes: { mesh: THREE.Mesh; xCenter: number; char: string }[] = [];

    words.forEach((w) => {
      let curX = w.startX;
      for (let i = 0; i < w.text.length; i++) {
        const char = w.text[i];
        const shape = createLetterShape(char, letterWidth, letterHeight);
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth: letterDepth,
          bevelEnabled: true,
          bevelThickness: 0.04,
          bevelSize: 0.03,
          bevelSegments: 3,
        });

        const mesh = new THREE.Mesh(geom, letterMat);
        // Lay flat embossed on ground: rotate -90 deg around X
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.set(curX, letterDepth, letterHeight * 0.4);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        textGroup.add(mesh);

        letterMeshes.push({ mesh, xCenter: curX + letterWidth / 2, char });
        curX += letterWidth + letterSpacing;
      }
    });

    // 8. 3D Yellow JCB Backhoe Loader
    const { jcb, wheels, beacon } = createJCBGroup();
    scene.add(jcb);

    // 9. Dust Particle System
    const particleCount = 180;
    const particleGeom = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleVelocities: { x: number; y: number; z: number; life: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = -25;
      particlePositions[i * 3 + 1] = 0;
      particlePositions[i * 3 + 2] = 0;
      particleVelocities.push({ x: 0, y: 0, z: 0, life: 0 });
    }
    particleGeom.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0xD6C7B2,
      size: 0.18,
      transparent: true,
      opacity: 0.65,
    });
    const dustPoints = new THREE.Points(particleGeom, particleMat);
    scene.add(dustPoints);

    // 10. Animation Control State
    let startTime = performance.now();
    let isRunning = true;
    let animId: number;

    const startX = -16.5;
    const stopX = 8.5;
    const travelDistance = stopX - startX;
    const travelDuration = 5200; // 5.2 seconds smooth drive
    let prevJcbX = startX;

    const resetAnimation = () => {
      startTime = performance.now();
      prevJcbX = startX;
      setPhase("running");
      setPrintProgress(0);
      clippingPlane.constant = -20;
    };
    animationResetRef.current = resetAnimation;

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);

      const elapsed = now - startTime;
      const tNorm = Math.min(elapsed / travelDuration, 1.0);

      // Smooth custom acceleration and deceleration easing
      const easedT = tNorm < 0.8
        ? (tNorm / 0.8) * 0.8
        : 0.8 + Math.sin(((tNorm - 0.8) / 0.2) * (Math.PI / 2)) * 0.2;

      const currentJcbX = startX + travelDistance * easedT;
      const deltaX = currentJcbX - prevJcbX;
      prevJcbX = currentJcbX;

      // Position JCB
      jcb.position.x = currentJcbX;
      jcb.position.z = 0;

      // Suspension heave & gentle engine idling vibration
      if (tNorm < 1.0) {
        jcb.position.y = Math.sin(elapsed * 0.015) * 0.025;
        jcb.rotation.z = Math.sin(elapsed * 0.012) * 0.012;
      } else {
        // Idling gentle thrum
        jcb.position.y = Math.sin(elapsed * 0.02) * 0.008;
        jcb.rotation.z = 0;
      }

      // Rotate wheels proportional to translation distance: dAngle = -dx / radius
      wheels.forEach(({ mesh, radius }) => {
        mesh.rotation.z -= deltaX / radius;
      });

      // Beacon rotation
      beacon.rotation.y = elapsed * 0.01;

      // Live synchronized ground printing
      // The rear edge of the JCB backhoe is at X - 2.2
      const printThreshold = currentJcbX - 2.2;
      clippingPlane.constant = printThreshold;

      // Calculate overall progress across text boundaries (-9.8 to +7.2)
      const textMinX = -9.8;
      const textMaxX = 7.2;
      const progress = Math.max(0, Math.min(100, Math.round(((printThreshold - textMinX) / (textMaxX - textMinX)) * 100)));
      setPrintProgress(progress);

      // Camera smooth tracking: pans slightly with the action then locks
      const targetCamX = THREE.MathUtils.lerp(-4.0, 0.5, Math.min(tNorm * 1.2, 1.0));
      camera.position.x = targetCamX;
      camera.lookAt(targetCamX * 0.4, 0.6, 0);

      // Dust particle emissions
      if (tNorm < 0.98 && Math.abs(deltaX) > 0.001) {
        const positions = particleGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          if (particleVelocities[i].life <= 0 && Math.random() < 0.25) {
            // Spawn particle behind rear wheels
            positions[i * 3] = currentJcbX - 1.2 + (Math.random() - 0.5) * 0.8;
            positions[i * 3 + 1] = 0.08 + Math.random() * 0.15;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 2.2;

            particleVelocities[i] = {
              x: -0.01 - Math.random() * 0.02,
              y: 0.01 + Math.random() * 0.02,
              z: (Math.random() - 0.5) * 0.02,
              life: 1.0,
            };
          } else if (particleVelocities[i].life > 0) {
            positions[i * 3] += particleVelocities[i].x;
            positions[i * 3 + 1] += particleVelocities[i].y;
            positions[i * 3 + 2] += particleVelocities[i].z;
            particleVelocities[i].life -= 0.025;
            if (particleVelocities[i].life <= 0) {
              positions[i * 3 + 1] = -5; // Hide
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
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Keyboard ESC shortcut to skip
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
              width={160}
              height={50}
              className="h-12 w-auto object-contain"
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

      {/* Top Header Controls */}
      <header className="absolute top-0 left-0 right-0 p-4 sm:p-6 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[#DCE4EE] shadow-sm pointer-events-auto">
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

      {/* Bottom Printing Progress HUD */}
      {phase === "running" && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-72 sm:w-80 bg-white/85 backdrop-blur-md px-4 py-3 rounded-2xl border border-[#DCE4EE] shadow-md z-20 flex flex-col gap-1.5 pointer-events-none transition-opacity duration-300">
          <div className="flex items-center justify-between text-xs font-semibold text-[#102F57]">
            <span className="flex items-center gap-1.5 text-[11px] text-[#F7931E]">
              <HardHat className="w-3.5 h-3.5 animate-bounce" />
              <span>Printing Construction Blueprint...</span>
            </span>
            <span className="font-mono text-[11px] text-[#64748B]">{printProgress}%</span>
          </div>
          <div className="w-full bg-[#E8EEF5] h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-[#F7931E] h-full rounded-full transition-all duration-100 ease-out"
              style={{ width: `${printProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Final Cinematic Brand Reveal Modal Card */}
      {phase === "completed" && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-500">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-lg border border-[#DCE4EE] p-6 sm:p-8 rounded-3xl shadow-2xl pointer-events-auto text-center space-y-5">
            <div className="flex justify-center">
              <Image
                src="/assets/anumaan-logo.png"
                alt="Anumaan Logo"
                width={180}
                height={55}
                className="h-12 w-auto object-contain"
                priority
              />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-[#102F57] tracking-tight">
                WELCOME TO ANUMAAN
              </h2>
              <p className="text-base font-bold text-[#F7931E] font-devanagari">
                मिनटों में पूरा अनुमान।
              </p>
              <p className="text-xs text-[#64748B] max-w-xs mx-auto">
                AI-assisted civil estimation, MoRTH & IS code drawing takeoff, and instant contractor quotations.
              </p>
            </div>

            {/* Quick Feature Pills */}
            <div className="grid grid-cols-3 gap-2 text-left py-1">
              <div className="p-2.5 rounded-xl bg-[#F6F8FB] border border-[#E8EEF5]">
                <Building2 className="w-4 h-4 text-[#F7931E] mb-1" />
                <div className="text-[11px] font-bold text-[#102F57]">Project-First</div>
                <div className="text-[9px] text-[#64748B]">Unified Workspace</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F6F8FB] border border-[#E8EEF5]">
                <HardHat className="w-4 h-4 text-[#F7931E] mb-1" />
                <div className="text-[11px] font-bold text-[#102F57]">Drawing Takeoff</div>
                <div className="text-[9px] text-[#64748B]">Auto MoRTH & IS</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#F6F8FB] border border-[#E8EEF5]">
                <FileSpreadsheet className="w-4 h-4 text-[#F7931E] mb-1" />
                <div className="text-[11px] font-bold text-[#102F57]">Live Quotations</div>
                <div className="text-[9px] text-[#64748B]">GST & Invoicing</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <button
                onClick={handleFinish}
                className="w-full sm:flex-1 py-3 px-4 bg-[#F7931E] hover:bg-[#e08215] text-[#102F57] rounded-xl text-xs font-bold transition shadow-md hover:shadow-lg flex items-center justify-center gap-2 group"
              >
                <span>Explore Anumaan</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>

              <button
                onClick={() => animationResetRef.current?.()}
                className="w-full sm:w-auto py-3 px-3.5 border border-[#DCE4EE] hover:bg-[#F3F6FA] text-[#64748B] hover:text-[#102F57] rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
                title="Replay 3D Intro"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#F7931E]" />
                <span className="sm:hidden">Replay Intro</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
