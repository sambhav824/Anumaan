"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import * as THREE from "three";
import { ArrowRight, RotateCcw, Building2, HardHat, FileSpreadsheet } from "lucide-react";
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
      shape.lineTo(w - t, h);
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
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 64, 10, 128, 64, 60);
  grad.addColorStop(0, "rgba(20, 24, 30, 0.65)");
  grad.addColorStop(0.5, "rgba(20, 24, 30, 0.3)");
  grad.addColorStop(1, "rgba(20, 24, 30, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Generates official authentic JCB brand badges.
 */
function createJcbArmBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#F59E00";
  ctx.fillRect(0, 0, 256, 80);

  ctx.fillStyle = "#16191E";
  ctx.beginPath();
  ctx.roundRect(10, 8, 236, 64, 8);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 46px 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("JCB", 128, 42);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createJcbBoomBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 160;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#F59E00";
  ctx.fillRect(0, 0, 160, 256);

  ctx.fillStyle = "#16191E";
  ctx.font = "900 54px 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(80, 95);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("JCB", 0, 0);
  ctx.restore();

  ctx.fillStyle = "#16191E";
  ctx.beginPath();
  ctx.roundRect(24, 180, 112, 50, 6);
  ctx.fill();

  ctx.fillStyle = "#F59E00";
  ctx.font = "bold 28px 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("3DX", 80, 205);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * High-fidelity, cinematic 3D JCB 3DX EcoXpert backhoe loader.
 * Modeled strictly following real mechanical construction equipment anatomy:
 * 1. Curved Swan-Neck Arched Backhoe Boom with JCB & 3DX branding and top hydraulic cylinder
 * 2. Articulated Dipper Stick & Curled Excavator Digging Bucket with heavy cast steel teeth
 * 3. Hydraulic Outrigger Stabilizer Legs with authentic yellow ground pads
 * 4. Dogleg Curved Loader Lift Arms with genuine JCB brand plates and torque cross-tube
 * 5. Curved 4-in-1 Clamshell Loader Bucket in elevated carry posture with teeth & spill guard
 * 6. Sculpted Aerodynamic Sloping Engine Bonnet with side louvers, exhaust stack & air snorkel
 * 7. Raked Operator Cabin (18° A-pillar slope), curved roof visor canopy, panoramic glass & rearview mirrors
 * 8. Rounded-Shoulder Heavy-Duty Wheels: ribbed front steer wheels & massive rear drive wheels with 18 V-lugs
 */
function createRealisticJCB() {
  const jcb = new THREE.Group();

  // Premium Construction Materials
  const jcbYellow = new THREE.MeshStandardMaterial({
    color: 0xF59E00, // Authentic JCB 3DX golden construction yellow
    roughness: 0.32,
    metalness: 0.22,
  });
  const darkChassis = new THREE.MeshStandardMaterial({
    color: 0x1A1F26,
    roughness: 0.65,
    metalness: 0.6,
  });
  const blackTrim = new THREE.MeshStandardMaterial({
    color: 0x12151A,
    roughness: 0.78,
    metalness: 0.25,
  });
  const chromeRam = new THREE.MeshStandardMaterial({
    color: 0xF5F7FA,
    roughness: 0.05,
    metalness: 0.98,
  });
  const mirrorChrome = new THREE.MeshStandardMaterial({
    color: 0xFFFFFF,
    roughness: 0.02,
    metalness: 1.0,
  });
  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x141619,
    roughness: 0.85,
    metalness: 0.08,
  });
  const cabGlass = new THREE.MeshPhysicalMaterial({
    color: 0x142030,
    transparent: true,
    opacity: 0.65,
    roughness: 0.1,
    metalness: 0.82,
    transmission: 0.65,
  });
  const bucketInterior = new THREE.MeshStandardMaterial({
    color: 0x1A1E24,
    roughness: 0.75,
    metalness: 0.45,
  });
  const castTeeth = new THREE.MeshStandardMaterial({
    color: 0x0D0F12,
    roughness: 0.7,
    metalness: 0.55,
  });

  const armBadgeTex = createJcbArmBadgeTexture();
  const armBadgeMat = new THREE.MeshBasicMaterial({ map: armBadgeTex });
  const boomBadgeTex = createJcbBoomBadgeTexture();
  const boomBadgeMat = new THREE.MeshBasicMaterial({ map: boomBadgeTex });

  // 0. Soft Ground Contact Shadow Patch
  const shadowTex = createContactShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(7.0, 3.6), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0.15, 0.015, 0);
  jcb.add(shadowPlane);

  // 1. Lower Chassis & Heavy Structural Frame
  const chassisGeom = new THREE.BoxGeometry(3.65, 0.68, 1.55);
  const chassis = new THREE.Mesh(chassisGeom, darkChassis);
  chassis.position.set(0, 0.92, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  jcb.add(chassis);

  // Front Heavy Cast Iron Counterweight Bumper
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.6, 1.58), darkChassis);
  bumper.position.set(1.82, 0.88, 0);
  bumper.castShadow = true;
  jcb.add(bumper);

  // Side Fuel Tank & Hydraulic Reservoir
  const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.95, 16), darkChassis);
  fuelTank.rotation.z = Math.PI / 2;
  fuelTank.position.set(0.12, 0.75, 0.86);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), chromeRam);
  cap.position.set(0.42, 0.95, 0.86);
  jcb.add(fuelTank, cap);

  // Operator Boarding Steps & Safety Grab Rails (Left & Right)
  [-0.92, 0.92].forEach((zSide) => {
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.28), blackTrim);
    step1.position.set(-0.35, 0.45, zSide);
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.28), blackTrim);
    step2.position.set(-0.35, 0.68, zSide * 0.95);
    const grabRail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.25, 8), darkChassis);
    grabRail.position.set(-0.68, 1.38, zSide);
    jcb.add(step1, step2, grabRail);
  });

  // Rear Heavy Outrigger Stabilizer Legs with Authentic Yellow Ground Pads
  [-0.98, 0.98].forEach((zSide) => {
    const jackLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.95, 12), darkChassis);
    jackLeg.position.set(-1.48, 0.82, zSide);
    const jackPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 10), chromeRam);
    jackPiston.position.set(-1.48, 0.45, zSide);
    const jackFoot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), jcbYellow);
    jackFoot.position.set(-1.48, 0.38, zSide);
    jackFoot.castShadow = true;
    jcb.add(jackLeg, jackPiston, jackFoot);
  });

  // 2. Sculpted Aerodynamic Engine Bonnet & Front Cowling
  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0.2, 0.95, 0);

  const hoodShape = new THREE.Shape();
  hoodShape.moveTo(0, 0);
  hoodShape.lineTo(0, 0.85); // Back height near cab
  hoodShape.lineTo(1.45, 0.62); // Sloping down forward
  hoodShape.quadraticCurveTo(1.75, 0.55, 1.82, 0.35); // Curved nose
  hoodShape.lineTo(1.82, 0);
  hoodShape.closePath();

  const hoodGeom = new THREE.ExtrudeGeometry(hoodShape, {
    depth: 1.42,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  const hoodMesh = new THREE.Mesh(hoodGeom, jcbYellow);
  hoodMesh.position.set(0, 0, -0.71);
  hoodMesh.castShadow = true;
  hoodGroup.add(hoodMesh);

  // Black Lower Intake Louver Grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.48, 1.25), blackTrim);
  grille.position.set(1.84, 0.26, 0);
  hoodGroup.add(grille);

  // Dual Rectangular Headlights + Amber Turn Indicators
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFEE,
    emissive: 0xFFE599,
    emissiveIntensity: 2.2,
  });
  const indMat = new THREE.MeshStandardMaterial({
    color: 0xF59E0B,
    emissive: 0xD97706,
    emissiveIntensity: 1.5,
  });
  [-0.48, 0.48].forEach((zSide) => {
    const hlHousing = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.26), darkChassis);
    hlHousing.position.set(1.78, 0.38, zSide);
    const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.22), hlMat);
    hlLens.position.set(1.82, 0.38, zSide);
    const indLens = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.1), indMat);
    indLens.position.set(1.82, 0.38, zSide + (zSide > 0 ? 0.18 : -0.18));
    hoodGroup.add(hlHousing, hlLens, indLens);
  });

  // Vertical Exhaust Stack with Rain Flap
  const exhaustGroup = new THREE.Group();
  exhaustGroup.position.set(0.3, 1.2, 0.68);
  const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.45, 12), darkChassis);
  const exhaustGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.95, 12), castTeeth);
  exhaustGuard.position.y = -0.15;
  const exhaustFlap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.09), chromeRam);
  exhaustFlap.position.set(0, 0.74, 0);
  exhaustFlap.rotation.z = 0.35;
  exhaustGroup.add(exhaustPipe, exhaustGuard, exhaustFlap);
  hoodGroup.add(exhaustGroup);

  // Cyclone Pre-Cleaner Air Snorkel
  const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 10), darkChassis);
  snorkel.position.set(0.3, 1.1, -0.68);
  const preCleanerBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.18, 12), darkChassis);
  preCleanerBowl.position.set(0.3, 1.75, -0.68);
  hoodGroup.add(snorkel, preCleanerBowl);

  jcb.add(hoodGroup);

  // 3. Raked Operator Cabin with Panoramic Glass & Forward Visor Overhang
  const cabGroup = new THREE.Group();
  cabGroup.position.set(-0.52, 1.35, 0);

  // Sculpted Raked Cabin Shell Profile (Windscreen leans back at 18 degrees!)
  const cabShape = new THREE.Shape();
  cabShape.moveTo(-0.75, 0);
  cabShape.lineTo(0.72, 0);
  cabShape.lineTo(0.35, 1.54); // Windscreen slope
  cabShape.lineTo(-0.75, 1.54);
  cabShape.closePath();

  const cabGlassGeom = new THREE.ExtrudeGeometry(cabShape, {
    depth: 1.32,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  const glassMesh = new THREE.Mesh(cabGlassGeom, cabGlass);
  glassMesh.position.set(0, 0, -0.66);
  cabGroup.add(glassMesh);

  // 6 Structural Roll-Cage Steel Pillars along Raked Profile
  const pMat = darkChassis;
  const makePillar = (x1: number, y1: number, x2: number, y2: number, z: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const pGeom = new THREE.CylinderGeometry(0.038, 0.038, len, 8);
    const pMesh = new THREE.Mesh(pGeom, pMat);
    pMesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
    pMesh.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
    pMesh.castShadow = true;
    cabGroup.add(pMesh);
  };

  [-0.66, 0.66].forEach((zSide) => {
    // Front Raked A-Pillar
    makePillar(0.72, 0, 0.35, 1.54, zSide);
    // Middle B-Pillar
    makePillar(-0.02, 0, -0.15, 1.54, zSide);
    // Rear C-Pillar
    makePillar(-0.75, 0, -0.75, 1.54, zSide);
  });

  // Sculpted Yellow Roof Canopy with Visor Overhang
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.85, 0);
  roofShape.lineTo(0.58, 0);
  roofShape.lineTo(0.55, 0.12);
  roofShape.lineTo(-0.85, 0.12);
  roofShape.closePath();

  const roofGeom = new THREE.ExtrudeGeometry(roofShape, {
    depth: 1.42,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  const roofMesh = new THREE.Mesh(roofGeom, jcbYellow);
  roofMesh.position.set(0, 1.54, -0.71);
  roofMesh.castShadow = true;
  cabGroup.add(roofMesh);

  // Roof Work Floodlights
  const workLightMat = new THREE.MeshStandardMaterial({
    color: 0xEEF5FF,
    emissive: 0xCCE3F5,
    emissiveIntensity: 1.5,
  });
  [-0.45, 0.45].forEach((zSide) => {
    const fLamp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.15), workLightMat);
    fLamp.position.set(0.5, 1.52, zSide);
    const rLamp = fLamp.clone();
    rLamp.position.x = -0.84;
    cabGroup.add(fLamp, rLamp);
  });

  // Tall Exterior Rearview Mirrors on Curved Stalks
  [-0.82, 0.82].forEach((zSide) => {
    const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.6, 6), darkChassis);
    mirrorStem.rotation.x = zSide > 0 ? -0.48 : 0.48;
    mirrorStem.rotation.z = -0.22;
    mirrorStem.position.set(0.48, 1.15, zSide * 0.9);
    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.2), darkChassis);
    mirrorHead.position.set(0.46, 1.42, zSide);
    const mirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.32), mirrorChrome);
    mirrorFace.rotation.y = -Math.PI / 2;
    mirrorFace.position.set(0.49, 1.42, zSide);
    cabGroup.add(mirrorStem, mirrorHead, mirrorFace);
  });

  // Interior Seat & Steering Wheel
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.44), blackTrim);
  seat.position.set(-0.25, 0.42, 0);
  const steeringPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), darkChassis);
  steeringPost.position.set(0.25, 0.55, 0);
  steeringPost.rotation.z = -0.42;
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 16), blackTrim);
  wheelRim.position.set(0.12, 0.82, 0);
  wheelRim.rotation.y = Math.PI / 2;
  wheelRim.rotation.x = -0.42;
  cabGroup.add(seat, steeringPost, wheelRim);

  // Amber Rotating Warning Beacon
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xF59E0B,
    emissive: 0xF59E0B,
    emissiveIntensity: 2.4,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.2, 12), beaconMat);
  beacon.position.set(-0.2, 1.76, 0.38);
  cabGroup.add(beacon);

  jcb.add(cabGroup);

  // Rear Mudguards & Heavy Mudflaps
  [-0.95, 0.95].forEach((zSide) => {
    const fender = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.46), jcbYellow);
    fender.position.set(-0.95, 1.58, zSide);
    fender.castShadow = true;
    const mudflap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.42), blackTrim);
    mudflap.position.set(-1.82, 1.25, zSide);
    jcb.add(fender, mudflap);
  });

  // 4. Front Loader Assembly (Articulated Dogleg Arms & Clamshell Bucket in Carry Angle)
  const loaderGroup = new THREE.Group();

  // Sculpted Dogleg Loader Arm Shape
  const armShape = new THREE.Shape();
  armShape.moveTo(0, 0);
  armShape.lineTo(0.25, 0.35);
  armShape.lineTo(1.45, 0.38);
  armShape.lineTo(2.05, 0.05);
  armShape.lineTo(1.98, -0.12);
  armShape.lineTo(1.4, 0.18);
  armShape.lineTo(0.2, 0.15);
  armShape.closePath();

  const armGeom = new THREE.ExtrudeGeometry(armShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });

  const armLeft = new THREE.Mesh(armGeom, jcbYellow);
  armLeft.position.set(0.95, 1.15, 0.72);
  armLeft.castShadow = true;

  // Authentic "JCB" Logo Badge on Loader Arm
  const armBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.22), armBadgeMat);
  armBadge.position.set(0.85, 0.28, 0.15);
  armLeft.add(armBadge);

  const armRight = new THREE.Mesh(armGeom, jcbYellow);
  armRight.position.set(0.95, 1.15, -0.86);
  armRight.castShadow = true;
  const armBadgeR = armBadge.clone();
  armBadgeR.position.z = -0.01;
  armBadgeR.rotation.y = Math.PI;
  armRight.add(armBadgeR);

  // Heavy Cross-Torque Structural Tube
  const torqueTube = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.58, 12), darkChassis);
  torqueTube.position.set(2.2, 1.48, 0);
  torqueTube.rotation.x = Math.PI / 2;

  // Hydraulic Lift Rams
  const cylGeom = new THREE.CylinderGeometry(0.058, 0.058, 1.05, 10);
  const rodGeom = new THREE.CylinderGeometry(0.032, 0.032, 0.95, 10);
  [-0.66, 0.66].forEach((zSide) => {
    const barrel = new THREE.Mesh(cylGeom, darkChassis);
    barrel.position.set(1.35, 1.15, zSide);
    barrel.rotation.z = 0.65;
    const rod = new THREE.Mesh(rodGeom, chromeRam);
    rod.position.set(1.78, 1.42, zSide);
    rod.rotation.z = 0.65;
    loaderGroup.add(barrel, rod);
  });

  // Sculpted Clamshell Loader Bucket (True Construction Scoop Geometry)
  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(2.95, 1.25, 0);
  bucketGroup.rotation.z = 0.45; // Elevated carry posture

  const bucketShape = new THREE.Shape();
  bucketShape.moveTo(-0.35, 0.42); // Top spill guard tip
  bucketShape.lineTo(-0.25, 0.42);
  bucketShape.lineTo(-0.15, 0.2);
  bucketShape.quadraticCurveTo(-0.32, -0.22, 0.18, -0.32); // Curved bottom
  bucketShape.lineTo(0.52, -0.32); // Front cutting lip
  bucketShape.lineTo(0.52, -0.38);
  bucketShape.lineTo(-0.28, -0.38);
  bucketShape.quadraticCurveTo(-0.42, -0.24, -0.35, 0.42);
  bucketShape.closePath();

  const bucketGeom = new THREE.ExtrudeGeometry(bucketShape, {
    depth: 2.15,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  const bucketMesh = new THREE.Mesh(bucketGeom, jcbYellow);
  bucketMesh.position.set(0, 0, -1.075);
  bucketMesh.castShadow = true;
  bucketGroup.add(bucketMesh);

  // Black Top Spill Guard & Interior Wear Plate
  const spillGuard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.35, 2.12), blackTrim);
  spillGuard.position.set(-0.22, 0.45, 0);
  const interiorLining = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 2.05), bucketInterior);
  interiorLining.position.set(-0.05, 0.02, 0);
  bucketGroup.add(spillGuard, interiorLining);

  // 6 Cast-Steel Digging Teeth along Front Cutting Lip
  for (let z = -0.92; z <= 0.95; z += 0.37) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.22, 4), castTeeth);
    tooth.position.set(0.62, -0.35, z);
    tooth.rotation.z = -Math.PI / 2;
    tooth.castShadow = true;
    bucketGroup.add(tooth);
  }

  loaderGroup.add(armLeft, armRight, torqueTube, bucketGroup);
  jcb.add(loaderGroup);

  // 5. Rear Excavator Backhoe Arm with Iconic Swan-Neck Arched Boom & "JCB 3DX" Branding!
  const backhoeGroup = new THREE.Group();
  backhoeGroup.position.set(-1.75, 1.1, 0);

  // Heavy Kingpost Swivel Tower
  const kingpost = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.78, 0.58), jcbYellow);
  backhoeGroup.add(kingpost);

  // Iconic Swan-Neck Arched Boom Profile (Modeled directly from reference image)
  const boomShape = new THREE.Shape();
  boomShape.moveTo(0, 0); // Kingpost pivot
  boomShape.quadraticCurveTo(-0.42, 1.15, -0.85, 2.15); // Outer arched curve
  boomShape.lineTo(-0.62, 2.26); // Crown tip
  boomShape.quadraticCurveTo(-0.18, 1.32, 0.22, 0.12); // Inner underside curve
  boomShape.closePath();

  const boomGeom = new THREE.ExtrudeGeometry(boomShape, {
    depth: 0.24,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 3,
  });
  const boomMesh = new THREE.Mesh(boomGeom, jcbYellow);
  boomMesh.position.set(0, 0, -0.12);
  boomMesh.castShadow = true;

  // Authentic "JCB" Vertical Decal & "3DX" Badge on Boom Side!
  const boomBadgeL = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.75), boomBadgeMat);
  boomBadgeL.position.set(-0.45, 1.18, 0.13);
  boomBadgeL.rotation.z = Math.PI / 2;
  const boomBadgeR = boomBadgeL.clone();
  boomBadgeR.position.z = -0.13;
  boomBadgeR.rotation.y = Math.PI;
  boomMesh.add(boomBadgeL, boomBadgeR);

  // Hydraulic Ram Cylinder along Top Spine of Arched Boom
  const bhCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.95, 10), darkChassis);
  bhCyl.position.set(-0.35, 1.25, 0);
  bhCyl.rotation.z = 0.92;
  const bhRod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.85, 8), chromeRam);
  bhRod.position.set(-0.68, 1.62, 0);
  bhRod.rotation.z = 0.92;

  // Dipper Arm (Stick) Folded in Roading Position
  const dipperShape = new THREE.Shape();
  dipperShape.moveTo(0, 0);
  dipperShape.lineTo(-0.16, 0);
  dipperShape.lineTo(-0.12, 1.45);
  dipperShape.lineTo(0.08, 1.45);
  dipperShape.closePath();

  const dipperGeom = new THREE.ExtrudeGeometry(dipperShape, {
    depth: 0.2,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  const dipperMesh = new THREE.Mesh(dipperGeom, jcbYellow);
  dipperMesh.position.set(-0.68, 2.15, -0.1);
  dipperMesh.rotation.z = -2.85; // Tucked down in transport lock
  dipperMesh.castShadow = true;

  // Curved Excavator Digging Bucket (Curled tightly in roading position)
  const bBucketShape = new THREE.Shape();
  bBucketShape.moveTo(-0.15, 0.3);
  bBucketShape.quadraticCurveTo(-0.4, 0.0, -0.1, -0.32);
  bBucketShape.lineTo(0.25, -0.32);
  bBucketShape.lineTo(0.2, 0.1);
  bBucketShape.closePath();

  const bBucketGeom = new THREE.ExtrudeGeometry(bBucketShape, {
    depth: 0.48,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  const backhoeBucket = new THREE.Mesh(bBucketGeom, darkChassis);
  backhoeBucket.position.set(-1.42, 0.42, -0.24);
  backhoeBucket.rotation.z = 0.45;
  backhoeBucket.castShadow = true;

  // 4 Cast Digging Teeth on Backhoe Bucket
  for (let bz = -0.16; bz <= 0.18; bz += 0.11) {
    const bTooth = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 4), castTeeth);
    bTooth.position.set(-1.68, 0.2, bz);
    bTooth.rotation.z = Math.PI / 2 + 0.45;
    backhoeGroup.add(bTooth);
  }

  backhoeGroup.add(boomMesh, bhCyl, bhRod, dipperMesh, backhoeBucket);
  jcb.add(backhoeGroup);

  // 6. High-Detail Wheels (Front Industrial Steer + Rear Giant Earthmover with 18 Chevron Lugs)
  const wheels: { group: THREE.Group; radius: number }[] = [];

  // Front Steer Wheel (Radius 0.45m, Width 0.36m, Ribbed Industrial Tread)
  const makeFrontWheel = (z: number) => {
    const wg = new THREE.Group();
    wg.position.set(1.15, 0.45, z);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.36, 24), tireRubber);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;

    // Rounded Tire Shoulders
    [-0.17, 0.17].forEach((sideZ) => {
      const shoulder = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 10, 24), tireRubber);
      shoulder.position.z = sideZ;
      wg.add(shoulder);
    });

    // Deep Yellow Rim with Recessed Center
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.37, 18), jcbYellow);
    rim.rotation.x = Math.PI / 2;

    // Dark Central Planetary Hub & 6 Wheel Hex Lug Nuts
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.39, 12), darkChassis);
    hub.rotation.x = Math.PI / 2;

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.025, 6), darkChassis);
      nut.rotation.x = Math.PI / 2;
      nut.position.set(Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0.19 * (z > 0 ? 1 : -1));
      wg.add(nut);
    }

    wg.add(tire, rim, hub);
    jcb.add(wg);
    wheels.push({ group: wg, radius: 0.45 });
  };

  // Rear Heavy Drive Wheel (Radius 0.76m, Width 0.56m, 18 Pairs of Directional Chevron V-Lugs!)
  const makeRearWheel = (z: number) => {
    const wg = new THREE.Group();
    wg.position.set(-0.95, 0.76, z);

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.56, 32), tireRubber);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;

    // Rounded Tire Shoulders
    [-0.26, 0.26].forEach((sideZ) => {
      const shoulder = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.1, 12, 32), tireRubber);
      shoulder.position.z = sideZ;
      wg.add(shoulder);
    });

    // Deep-Dish Yellow Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 0.57, 24), jcbYellow);
    rim.rotation.x = Math.PI / 2;

    // Planetary Gear Hub
    const planetary = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.61, 14), darkChassis);
    planetary.rotation.x = Math.PI / 2;

    wg.add(tire, rim, planetary);

    // 18 Pairs of Directional Chevron Lugs in V-Pattern
    const lugGeom = new THREE.BoxGeometry(0.18, 0.065, 0.24);
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const lx = Math.cos(angle) * 0.77;
      const ly = Math.sin(angle) * 0.77;

      const lugL = new THREE.Mesh(lugGeom, tireRubber);
      lugL.position.set(lx, ly, -0.12);
      lugL.rotation.z = angle;
      lugL.rotation.y = 0.42;

      const lugR = new THREE.Mesh(lugGeom, tireRubber);
      lugR.position.set(lx, ly, 0.12);
      lugR.rotation.z = angle;
      lugR.rotation.y = -0.42;

      wg.add(lugL, lugR);
    }

    jcb.add(wg);
    wheels.push({ group: wg, radius: 0.76 });
  };

  makeFrontWheel(0.94);
  makeFrontWheel(-0.94);
  makeRearWheel(1.0);
  makeRearWheel(-1.0);

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

    // 9. Realistic 3D Yellow JCB 3DX Backhoe Loader
    const { jcb, wheels, beacon } = createRealisticJCB();
    jcb.position.z = 0.85;
    scene.add(jcb);

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
      jcb.position.x = currentJcbX;

      // Suspension heave & gentle engine idling vibration
      if (tNorm < 1.0) {
        jcb.position.y = Math.sin(elapsed * 0.016) * 0.022;
        jcb.rotation.z = Math.sin(elapsed * 0.013) * 0.012;
      } else {
        jcb.position.y = Math.sin(elapsed * 0.02) * 0.006;
        jcb.rotation.z = 0;
      }

      // Rotate wheels proportional to linear distance: dAngle = -dx / radius
      wheels.forEach(({ group, radius }) => {
        group.rotation.z -= deltaX / radius;
      });

      // Amber beacon rotation
      beacon.rotation.y = elapsed * 0.012;

      // Live Position-Synchronized Reveal:
      // The rear edge of the JCB backhoe is at currentJcbX - 2.5.
      // Progressively reveals "WELCOME TO" and then the complete Anumaan brand logo!
      const printThreshold = currentJcbX - 2.5;
      clippingPlane.constant = printThreshold;

      // Dust particles (active only while moving)
      if (tNorm < 0.98 && Math.abs(deltaX) > 0.001) {
        const positions = particleGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          if (particleVelocities[i].life <= 0 && Math.random() < 0.28) {
            positions[i * 3] = currentJcbX - 1.6 + (Math.random() - 0.5) * 0.8;
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
