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
  grad.addColorStop(0, "rgba(20, 24, 30, 0.70)");
  grad.addColorStop(0.5, "rgba(20, 24, 30, 0.35)");
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

    const sunLight = new THREE.DirectionalLight(0xFFF6E6, 1.8);
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

    // 9. Real 3D JCB 3DX Backhoe Loader (Tractor, Cab, Wheels, Loader, Backhoe, Stabilizer Legs)
    const jcbGroup = new THREE.Group();
    scene.add(jcbGroup);

    // Authentic PBR Materials matching JCB Industrial Standard
    const matJcbYellow = new THREE.MeshStandardMaterial({
      color: 0xF59E00, // Authentic JCB Golden Construction Yellow
      roughness: 0.32,
      metalness: 0.20,
    });
    const matDarkChassis = new THREE.MeshStandardMaterial({
      color: 0x1B1F26, // Heavy Cast Iron / Underchassis Charcoal
      roughness: 0.65,
      metalness: 0.50,
    });
    const matTireRubber = new THREE.MeshStandardMaterial({
      color: 0x121417, // Vulcanized Carbon Tread Rubber
      roughness: 0.90,
      metalness: 0.05,
    });
    const matChromeHydraulic = new THREE.MeshStandardMaterial({
      color: 0xE8ECF2, // Gleaming Hard-Chrome Hydraulic Ram
      roughness: 0.12,
      metalness: 0.95,
    });
    const matBlackTrim = new THREE.MeshStandardMaterial({
      color: 0x111316, // Matte Black Trim, Pillars, Grille, Fenders
      roughness: 0.75,
      metalness: 0.20,
    });
    const matCabGlass = new THREE.MeshPhysicalMaterial({
      color: 0x142030, // Smoked Safety Glazing
      transparent: true,
      opacity: 0.70,
      roughness: 0.1,
      metalness: 0.8,
      transmission: 0.65,
      side: THREE.DoubleSide,
    });
    const matHeadlight = new THREE.MeshStandardMaterial({
      color: 0xFFFBEB,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0xFFE082,
      emissiveIntensity: 0.7,
    });

    // Ground Contact Shadow Patch below wheels
    const shadowTex = createContactShadowTexture();
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(8.0, 3.0), shadowMat);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.set(0.1, 0.015, 0);
    jcbGroup.add(shadowPlane);

    // --- A. CHASSIS & TRACTOR BODY ---
    // Central chassis box
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.52, 1.25), matDarkChassis);
    chassis.position.set(0.15, 0.82, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    jcbGroup.add(chassis);

    // Front chin bumper and counterweight
    const chinBumper = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.55, 1.3), matDarkChassis);
    chinBumper.position.set(1.95, 0.68, 0);
    chinBumper.castShadow = true;
    jcbGroup.add(chinBumper);

    // Sloped Engine Hood (JCB Yellow)
    const hoodGeom = new THREE.BoxGeometry(1.55, 0.58, 1.08);
    const hood = new THREE.Mesh(hoodGeom, matJcbYellow);
    hood.position.set(1.15, 1.38, 0);
    hood.rotation.z = -0.055; // gentle aerodynamic nose slope
    hood.castShadow = true;
    hood.receiveShadow = true;
    jcbGroup.add(hood);

    // Radiator grille & front fascia (Matte Black)
    const grille = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.48, 0.98), matBlackTrim);
    grille.position.set(1.94, 1.28, 0);
    jcbGroup.add(grille);

    // Front Twin Headlights
    [-0.38, 0.38].forEach((zPos) => {
      const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.18), matBlackTrim);
      hlHousing.position.set(1.92, 1.42, zPos);
      const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.12, 0.14), matHeadlight);
      hlLens.position.set(1.96, 1.42, zPos);
      jcbGroup.add(hlHousing, hlLens);
    });

    // Side toolboxes, battery box, and fuel tank
    const fuelTank = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.28), matDarkChassis);
    fuelTank.position.set(-0.25, 0.65, -0.74);
    const hydTank = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.45, 0.28), matDarkChassis);
    hydTank.position.set(-0.25, 0.65, 0.74);
    jcbGroup.add(fuelTank, hydTank);

    // Operator Entry Steps (Left & Right)
    [-0.82, 0.82].forEach((zSide) => {
      const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.20), matBlackTrim);
      step1.position.set(-0.15, 0.42, zSide);
      const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.04, 0.20), matBlackTrim);
      step2.position.set(-0.15, 0.60, zSide);
      jcbGroup.add(step1, step2);
    });

    // Vertical Exhaust Stack (Right A-Pillar)
    const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.15, 14), matBlackTrim);
    exhaust.position.set(0.42, 2.15, 0.58);
    exhaust.castShadow = true;
    const exhaustCap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.04, 0.12, 14), matBlackTrim);
    exhaustCap.position.set(0.42, 2.75, 0.58);
    jcbGroup.add(exhaust, exhaustCap);

    // Intake Snorkel (Left A-Pillar)
    const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.95, 14), matBlackTrim);
    snorkel.position.set(0.42, 2.05, -0.58);
    const snorkelCap = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.08, 0.10, 14), matBlackTrim);
    snorkelCap.position.set(0.42, 2.55, -0.58);
    jcbGroup.add(snorkel, snorkelCap);

    // --- B. COMMANDPLUS CABIN ---
    const cabGroup = new THREE.Group();
    cabGroup.position.set(-0.35, 2.05, 0);

    // Glazed Cabin Volume (Smoked safety glass)
    const cabGlassMesh = new THREE.Mesh(new THREE.BoxGeometry(1.48, 1.18, 1.28), matCabGlass);
    cabGlassMesh.castShadow = true;
    cabGroup.add(cabGlassMesh);

    // Structural ROPS Pillars (Black)
    [-0.62, 0.62].forEach((zP) => {
      const aPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.22, 0.08), matBlackTrim);
      aPillar.position.set(0.70, 0, zP);
      const bPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.22, 0.08), matBlackTrim);
      bPillar.position.set(-0.10, 0, zP);
      const cPillar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.22, 0.08), matBlackTrim);
      cPillar.position.set(-0.70, 0, zP);
      cabGroup.add(aPillar, bPillar, cPillar);
    });

    // Sculpted Yellow Roof with Front Canopy Visor
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 1.38), matJcbYellow);
    roof.position.set(0.04, 0.64, 0);
    roof.castShadow = true;
    cabGroup.add(roof);

    // Interior Operator Seat & Steering Console (visible through glass)
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.45), matBlackTrim);
    seat.position.set(-0.25, -0.15, 0);
    const steeringCol = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.45, 10), matDarkChassis);
    steeringCol.position.set(0.40, -0.12, 0);
    steeringCol.rotation.z = -0.35;
    const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.025, 8, 16), matBlackTrim);
    steeringWheel.position.set(0.32, 0.08, 0);
    steeringWheel.rotation.y = Math.PI / 2;
    steeringWheel.rotation.x = 0.35;
    cabGroup.add(seat, steeringCol, steeringWheel);

    // Roof Floodlights (2 front facing, 2 rear facing)
    [
      { x: 0.82, y: 0.66, z: -0.48 },
      { x: 0.82, y: 0.66, z: 0.48 },
      { x: -0.74, y: 0.66, z: -0.48 },
      { x: -0.74, y: 0.66, z: 0.48 },
    ].forEach((fl) => {
      const flHousing = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), matBlackTrim);
      flHousing.position.set(fl.x, fl.y, fl.z);
      const flLens = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.10), matHeadlight);
      flLens.position.set(fl.x + (fl.x > 0 ? 0.05 : -0.05), fl.y, fl.z);
      cabGroup.add(flHousing, flLens);
    });

    jcbGroup.add(cabGroup);

    // --- C. WHEELS (TRUE BACKHOE PROPORTIONS WITH CHEVRON LUGS) ---
    const wheels: { group: THREE.Group; radius: number }[] = [];

    // 1. Front Industrial Steer Wheels (Smaller: R = 0.46m)
    [-0.96, 0.96].forEach((zSide) => {
      const wg = new THREE.Group();
      wg.position.set(1.35, 0.46, zSide);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.34, 28), matTireRubber);
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.35, 20), matJcbYellow);
      rim.rotation.x = Math.PI / 2;

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.38, 12), matDarkChassis);
      hub.rotation.x = Math.PI / 2;

      wg.add(tire, rim, hub);
      jcbGroup.add(wg);
      wheels.push({ group: wg, radius: 0.46 });
    });

    // 2. Rear Giant Earthmover Wheels (R = 0.80m, with 18 Chevron Traction Cleats)
    [-1.05, 1.05].forEach((zSide) => {
      const wg = new THREE.Group();
      wg.position.set(-1.0, 0.80, zSide);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.54, 32), matTireRubber);
      tire.rotation.x = Math.PI / 2;
      tire.castShadow = true;

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.50, 0.50, 0.55, 24), matJcbYellow);
      rim.rotation.x = Math.PI / 2;

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.60, 16), matDarkChassis);
      hub.rotation.x = Math.PI / 2;

      // 18 directional chevron tread lugs (V-pattern angle 38 deg)
      const lugGeom = new THREE.BoxGeometry(0.18, 0.07, 0.24);
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        const lx = Math.cos(angle) * 0.81;
        const ly = Math.sin(angle) * 0.81;

        const lugL = new THREE.Mesh(lugGeom, matTireRubber);
        lugL.position.set(lx, ly, -0.12);
        lugL.rotation.z = angle;
        lugL.rotation.y = 0.40;

        const lugR = new THREE.Mesh(lugGeom, matTireRubber);
        lugR.position.set(lx, ly, 0.12);
        lugR.rotation.z = angle;
        lugR.rotation.y = -0.40;

        wg.add(lugL, lugR);
      }

      wg.add(tire, rim, hub);
      jcbGroup.add(wg);
      wheels.push({ group: wg, radius: 0.80 });
    });

    // --- D. FRONT LOADER ASSEMBLY ("Loader") ---
    const loaderGroup = new THREE.Group();

    // Dual Loader Lift Arms (Left & Right)
    [-0.72, 0.72].forEach((zArm) => {
      // Rear section of loader arm: cab base (0.15, 1.22) to knee (1.35, 1.45)
      const rearArmLen = 1.22;
      const armRear = new THREE.Mesh(new THREE.BoxGeometry(rearArmLen, 0.16, 0.10), matJcbYellow);
      armRear.position.set(0.75, 1.34, zArm);
      armRear.rotation.z = 0.19;
      armRear.castShadow = true;

      // Front section of loader arm: knee (1.35, 1.45) down to bucket pivot (2.48, 0.48)
      const frontArmLen = 1.48;
      const armFront = new THREE.Mesh(new THREE.BoxGeometry(frontArmLen, 0.16, 0.10), matJcbYellow);
      armFront.position.set(1.92, 0.96, zArm);
      armFront.rotation.z = -0.71;
      armFront.castShadow = true;

      // Hydraulic Lift Cylinder (Barrel + Chrome Ram)
      const cylBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.65, 14), matDarkChassis);
      cylBarrel.position.set(0.68, 0.98, zArm);
      cylBarrel.rotation.z = -0.72;
      const cylRam = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.55, 14), matChromeHydraulic);
      cylRam.position.set(0.98, 1.25, zArm);
      cylRam.rotation.z = -0.72;

      loaderGroup.add(armRear, armFront, cylBarrel, cylRam);
    });

    // Cross-member torsion tube connecting arms
    const crossTube = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.44, 14), matJcbYellow);
    crossTube.position.set(1.35, 1.45, 0);
    crossTube.rotation.x = Math.PI / 2;
    loaderGroup.add(crossTube);

    // Front Loader Bucket (Wide 2.28m Clamshell Scoop)
    const bucketGroup = new THREE.Group();
    bucketGroup.position.set(2.48, 0.48, 0);

    const bucketBack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.72, 2.28), matDarkChassis);
    bucketBack.position.set(0.08, 0.12, 0);
    bucketBack.rotation.z = -0.22;
    bucketBack.castShadow = true;

    const bucketFloor = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.10, 2.28), matDarkChassis);
    bucketFloor.position.set(0.28, -0.22, 0);
    bucketFloor.rotation.z = 0.08;
    bucketFloor.castShadow = true;

    const bucketBlade = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 2.30), matDarkChassis);
    bucketBlade.position.set(0.55, -0.24, 0);

    const bucketSpillGuard = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 2.28), matDarkChassis);
    bucketSpillGuard.position.set(0.16, 0.52, 0);
    bucketSpillGuard.rotation.z = 0.45;

    // Side cutter plates
    [-1.13, 1.13].forEach((zSide) => {
      const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.65, 0.04), matDarkChassis);
      sidePlate.position.set(0.22, 0.06, zSide);
      bucketGroup.add(sidePlate);
    });

    bucketGroup.add(bucketBack, bucketFloor, bucketBlade, bucketSpillGuard);
    loaderGroup.add(bucketGroup);
    jcbGroup.add(loaderGroup);

    // --- E. REAR BACKHOE ASSEMBLY ("Backhoe & Stabilizer Legs") ---
    const backhoeGroup = new THREE.Group();

    // Kingpost / Swing Tower (Rear Pivot)
    const kingpost = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.75, 0.65), matDarkChassis);
    kingpost.position.set(-1.38, 0.95, 0);
    kingpost.castShadow = true;
    backhoeGroup.add(kingpost);

    // Stabilizer Outrigger Legs (Left & Right)
    [-1.08, 1.08].forEach((zStab) => {
      const stabLeg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12), matJcbYellow);
      stabLeg.position.set(-1.26, 0.62, zStab);
      stabLeg.castShadow = true;

      const stabFoot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.28), matDarkChassis);
      stabFoot.position.set(-1.26, 0.20, zStab);
      stabFoot.castShadow = true;

      backhoeGroup.add(stabLeg, stabFoot);
    });

    // Curved Arched Backhoe Boom (Iconic JCB curved banana boom)
    const boomPart1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.24, 0.20), matJcbYellow);
    boomPart1.position.set(-1.75, 1.55, 0);
    boomPart1.rotation.z = -0.92;
    boomPart1.castShadow = true;

    const boomPart2 = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.24, 0.20), matJcbYellow);
    boomPart2.position.set(-2.28, 2.38, 0);
    boomPart2.rotation.z = -0.28;
    boomPart2.castShadow = true;

    const boomPart3 = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.22, 0.18), matJcbYellow);
    boomPart3.position.set(-2.82, 2.12, 0);
    boomPart3.rotation.z = 0.58;
    boomPart3.castShadow = true;

    // Boom Hydraulic Lift Cylinder (Underneath)
    const boomCylBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.68, 14), matDarkChassis);
    boomCylBarrel.position.set(-1.58, 1.25, 0);
    boomCylBarrel.rotation.z = -0.75;
    const boomCylRam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 14), matChromeHydraulic);
    boomCylRam.position.set(-1.88, 1.62, 0);
    boomCylRam.rotation.z = -0.75;

    // Dipper Stick ("Stick") hinged at boom apex (-2.82, 2.12)
    const dipperStick = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.18, 0.16), matJcbYellow);
    dipperStick.position.set(-3.08, 1.42, 0);
    dipperStick.rotation.z = -1.22;
    dipperStick.castShadow = true;

    // Dipper hydraulic cylinder (Top of boom)
    const dipperCylBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.58, 14), matDarkChassis);
    dipperCylBarrel.position.set(-2.45, 2.52, 0);
    dipperCylBarrel.rotation.z = 0.42;
    const dipperCylRam = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.50, 14), matChromeHydraulic);
    dipperCylRam.position.set(-2.78, 2.38, 0);
    dipperCylRam.rotation.z = 0.42;

    // Excavator Digging Bucket ("Bucket") with 5 Cast Rock Teeth
    const rearBucketGroup = new THREE.Group();
    rearBucketGroup.position.set(-3.24, 0.68, 0);

    const bucketShell = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.58), matDarkChassis);
    bucketShell.position.set(-0.10, -0.12, 0);
    bucketShell.rotation.z = 0.52;
    bucketShell.castShadow = true;

    // 5 pointed cast rock digging teeth curling under
    const toothGeom = new THREE.ConeGeometry(0.045, 0.16, 6);
    toothGeom.rotateX(Math.PI / 2);
    [-0.24, -0.12, 0, 0.12, 0.24].forEach((zT) => {
      const tooth = new THREE.Mesh(toothGeom, matDarkChassis);
      tooth.position.set(-0.28, -0.32, zT);
      tooth.rotation.z = 0.68;
      tooth.castShadow = true;
      rearBucketGroup.add(tooth);
    });

    rearBucketGroup.add(bucketShell);

    backhoeGroup.add(
      boomPart1,
      boomPart2,
      boomPart3,
      boomCylBarrel,
      boomCylRam,
      dipperStick,
      dipperCylBarrel,
      dipperCylRam,
      rearBucketGroup
    );
    jcbGroup.add(backhoeGroup);

    jcbGroup.position.z = 0.85;

    // 10. Subtle Ground Dust Particles drifting from under the crawler tracks
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

    const startX = -15.5;
    const stopX = 10.5;
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

      // Realistic suspension heave & engine idling rumble
      if (tNorm < 1.0) {
        jcbGroup.position.y = Math.sin(elapsed * 0.018) * 0.024;
        jcbGroup.rotation.z = Math.sin(elapsed * 0.014) * 0.012;
      } else {
        jcbGroup.position.y = Math.sin(elapsed * 0.02) * 0.006;
        jcbGroup.rotation.z = 0;
      }

      // True physical rolling rotation without slipping: dAngle = -dx / radius
      wheels.forEach(({ group, radius }) => {
        group.rotation.z -= deltaX / radius;
      });

      // Live Position-Synchronized Reveal:
      // The rear edge of the vehicle (backhoe bucket teeth) is at currentJcbX - 3.55.
      // Progressively reveals "WELCOME TO" and then the complete official Anumaan brand logo!
      const printThreshold = currentJcbX - 3.55;
      clippingPlane.constant = printThreshold;

      // Dust particles (active only while moving)
      if (tNorm < 0.98 && Math.abs(deltaX) > 0.001) {
        const positions = particleGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          if (particleVelocities[i].life <= 0 && Math.random() < 0.28) {
            positions[i * 3] = currentJcbX - 1.8 + (Math.random() - 0.5) * 1.2;
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
