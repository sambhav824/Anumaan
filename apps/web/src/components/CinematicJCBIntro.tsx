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
 * High-fidelity, cinematic 3D Tracked Heavy Crawler Excavator
 * Modeled strictly following the user's reference diagram (media_1793261026310_c5581784.png):
 * 1. Track Groups: Dual heavy caterpillar crawler tracks, front idlers with track springs,
 *    rear drive sprockets with final drive hubs, bottom rollers, top carrier rollers & steel track pads
 * 2. Swing Drive & Swing Ring turntable linking undercarriage to revolving upper house
 * 3. Engine & Superstructure: Cast counterweight at rear, engine deck with louvers, pump housing & exhaust pipe
 * 4. Ergonomic Operator Cab: Curved panoramic glass, ROPS steel cage, interior seat & joysticks, work lights & beacon
 * 5. Heavy Arched Mono-Boom: Iconic arched box boom in bright yellow, twin boom hydraulic cylinders & JCB decals
 * 6. Dipper Stick & Hydraulic Cylinder: Articulated dipper arm with top hydraulic cylinder & hydraulic lines
 * 7. Heavy Excavation Bucket with Attachments: Curved bucket with 5 cast teeth, H-linkage & quick-coupler attachment bracket
 */
function createRealisticJCB() {
  const jcb = new THREE.Group();

  // Premium Construction Materials
  const jcbYellow = new THREE.MeshStandardMaterial({
    color: 0xF59E00, // Authentic JCB industrial golden construction yellow
    roughness: 0.32,
    metalness: 0.22,
  });
  const darkChassis = new THREE.MeshStandardMaterial({
    color: 0x1A1F26,
    roughness: 0.68,
    metalness: 0.55,
  });
  const blackTrim = new THREE.MeshStandardMaterial({
    color: 0x12151A,
    roughness: 0.78,
    metalness: 0.25,
  });
  const trackSteel = new THREE.MeshStandardMaterial({
    color: 0x181A1D,
    roughness: 0.85,
    metalness: 0.45,
  });
  const chromeRam = new THREE.MeshStandardMaterial({
    color: 0xF5F7FA,
    roughness: 0.05,
    metalness: 0.98,
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

  const boomBadgeTex = createJcbBoomBadgeTexture();
  const boomBadgeMat = new THREE.MeshBasicMaterial({ map: boomBadgeTex });

  // 0. Soft Ground Contact Shadow Beneath Dual Tracks
  const shadowTex = createContactShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 4.2), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0.2, 0.015, 0);
  jcb.add(shadowPlane);

  // 1. Undercarriage: Central Carbody & Slewing Turntable
  const carbody = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 1.8), darkChassis);
  carbody.position.set(0, 0.68, 0);
  carbody.castShadow = true;
  jcb.add(carbody);

  // Slewing Ring Turntable
  const swingRing = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.92, 0.22, 24), darkChassis);
  swingRing.position.set(0, 0.92, 0);
  jcb.add(swingRing);

  // Rotating track rollers and sprockets array
  const wheels: { group: THREE.Group; radius: number }[] = [];

  // Helper to build heavy Caterpillar Track Groups on Left & Right
  const makeTrackGroup = (z: number) => {
    const trackGroup = new THREE.Group();
    trackGroup.position.set(0, 0, z);

    // Track Side Frame (Heavy Steel Beam with Angled Ramp Ends)
    const frameShape = new THREE.Shape();
    frameShape.moveTo(-2.25, 0.28);
    frameShape.lineTo(-1.8, 0.85); // rear ramp up to sprocket
    frameShape.lineTo(1.8, 0.85);  // top rail
    frameShape.lineTo(2.25, 0.28);  // front ramp down to idler
    frameShape.lineTo(1.9, 0.16);
    frameShape.lineTo(-1.9, 0.16);
    frameShape.closePath();

    const frameGeom = new THREE.ExtrudeGeometry(frameShape, {
      depth: 0.58,
      bevelEnabled: true,
      bevelThickness: 0.03,
      bevelSize: 0.02,
      bevelSegments: 2,
    });
    const trackFrame = new THREE.Mesh(frameGeom, darkChassis);
    trackFrame.position.set(0, 0, -0.29);
    trackFrame.castShadow = true;
    trackGroup.add(trackFrame);

    // Front Idler Wheel with Track Spring & Recoil Tensioner
    const idlerGroup = new THREE.Group();
    idlerGroup.position.set(1.85, 0.48, 0);
    const idlerWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.52, 20), trackSteel);
    idlerWheel.rotation.x = Math.PI / 2;
    idlerWheel.castShadow = true;
    const idlerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.56, 12), darkChassis);
    idlerHub.rotation.x = Math.PI / 2;
    idlerGroup.add(idlerWheel, idlerHub);
    trackGroup.add(idlerGroup);
    wheels.push({ group: idlerGroup, radius: 0.42 });

    // Track Spring Tensioner Cylinder behind Front Idler
    const springTensioner = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.65, 10), darkChassis);
    springTensioner.rotation.z = Math.PI / 2;
    springTensioner.position.set(1.35, 0.48, 0);
    trackGroup.add(springTensioner);

    // Rear Drive Sprocket with Final Drive Gearbox Hub & Travel Motor
    const sprocketGroup = new THREE.Group();
    sprocketGroup.position.set(-1.85, 0.48, 0);
    const sprocketWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.52, 18), trackSteel);
    sprocketWheel.rotation.x = Math.PI / 2;
    sprocketWheel.castShadow = true;

    // Sprocket Teeth along Outer Perimeter
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.5), trackSteel);
      tooth.position.set(Math.cos(a) * 0.44, Math.sin(a) * 0.44, 0);
      tooth.rotation.z = a;
      sprocketGroup.add(tooth);
    }

    // Heavy Final Drive Hub Cap
    const finalDriveCap = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.58, 14), darkChassis);
    finalDriveCap.rotation.x = Math.PI / 2;
    sprocketGroup.add(sprocketWheel, finalDriveCap);
    trackGroup.add(sprocketGroup);
    wheels.push({ group: sprocketGroup, radius: 0.42 });

    // 7 Bottom Track Rollers Supporting Machine Weight
    for (let r = 0; r < 7; r++) {
      const rx = -1.35 + r * 0.45;
      const rollerGroup = new THREE.Group();
      rollerGroup.position.set(rx, 0.24, 0);
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.48, 12), trackSteel);
      roller.rotation.x = Math.PI / 2;
      rollerGroup.add(roller);
      trackGroup.add(rollerGroup);
      wheels.push({ group: rollerGroup, radius: 0.16 });
    }

    // 2 Top Carrier Rollers
    [-0.65, 0.65].forEach((cx) => {
      const carrierGroup = new THREE.Group();
      carrierGroup.position.set(cx, 0.82, 0);
      const carrier = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.48, 10), trackSteel);
      carrier.rotation.x = Math.PI / 2;
      carrierGroup.add(carrier);
      trackGroup.add(carrierGroup);
      wheels.push({ group: carrierGroup, radius: 0.12 });
    });

    // Continuous Caterpillar Track Belt with Grousers (Steel Track Pads)
    // Bottom track run (touching ground)
    const bottomTrack = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.08, 0.62), trackSteel);
    bottomTrack.position.set(0, 0.05, 0);
    bottomTrack.receiveShadow = true;

    // Top track run
    const topTrack = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.08, 0.62), trackSteel);
    topTrack.position.set(0, 0.92, 0);
    topTrack.castShadow = true;

    // Angled front track wrap
    const frontWrap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.62), trackSteel);
    frontWrap.position.set(2.05, 0.48, 0);
    frontWrap.rotation.z = -Math.PI / 3;

    // Angled rear track wrap
    const rearWrap = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.62), trackSteel);
    rearWrap.position.set(-2.05, 0.48, 0);
    rearWrap.rotation.z = Math.PI / 3;

    trackGroup.add(bottomTrack, topTrack, frontWrap, rearWrap);

    // Track Shoe Cleats / Grousers along Ground Run
    for (let g = -1.8; g <= 1.85; g += 0.22) {
      const grouser = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.035, 0.64), blackTrim);
      grouser.position.set(g, 0.02, 0);
      trackGroup.add(grouser);
    }

    jcb.add(trackGroup);
  };

  makeTrackGroup(1.18);
  makeTrackGroup(-1.18);

  // 2. Revolving Upper Superstructure (House / Engine / Pumps / Counterweight)
  const houseGroup = new THREE.Group();
  houseGroup.position.set(0, 1.05, 0);

  // Revolving Main Deck Baseplate
  const deckPlate = new THREE.Mesh(new THREE.BoxGeometry(4.3, 0.22, 2.7), darkChassis);
  deckPlate.position.set(-0.25, 0.11, 0);
  deckPlate.castShadow = true;
  houseGroup.add(deckPlate);

  // Heavy Cast Counterweight at Rear
  const cwShape = new THREE.Shape();
  cwShape.moveTo(0, 0);
  cwShape.lineTo(0, 1.35);
  cwShape.lineTo(-0.75, 1.35);
  cwShape.quadraticCurveTo(-1.3, 0.95, -1.35, 0.35); // rounded rear profile
  cwShape.lineTo(-1.35, 0);
  cwShape.closePath();

  const cwGeom = new THREE.ExtrudeGeometry(cwShape, {
    depth: 2.68,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.03,
    bevelSegments: 3,
  });
  const counterweight = new THREE.Mesh(cwGeom, jcbYellow);
  counterweight.position.set(-1.15, 0.22, -1.34);
  counterweight.castShadow = true;
  houseGroup.add(counterweight);

  // Black Lower Rear Inset Bumper & Safety Reflectors
  const cwBumper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.35, 2.65), darkChassis);
  cwBumper.position.set(-2.38, 0.38, 0);
  houseGroup.add(cwBumper);

  // Engine Compartment & Hydraulic Pump Cowling (Center & Right Side)
  const engineHood = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.95, 1.55), jcbYellow);
  engineHood.position.set(-0.25, 0.72, -0.55);
  engineHood.castShadow = true;
  houseGroup.add(engineHood);

  // Engine Hood Ventilation Louvers (Black Inset Grilles)
  const louver1 = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.05, 1.25), blackTrim);
  louver1.position.set(-0.25, 1.21, -0.55);
  houseGroup.add(louver1);

  // Tall Vertical Exhaust Pipe & Rain Flap (Engine Exhaust)
  const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.95, 12), darkChassis);
  exhaustPipe.position.set(-1.05, 1.65, -0.75);
  const exhaustCap = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.09), chromeRam);
  exhaustCap.position.set(-1.05, 2.14, -0.75);
  exhaustCap.rotation.z = 0.35;
  houseGroup.add(exhaustPipe, exhaustCap);

  // Hydraulic Main Control Valve Compartment (Right Side Cowling)
  const valveHousing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.82, 0.65), jcbYellow);
  valveHousing.position.set(0.65, 0.65, -0.98);
  valveHousing.castShadow = true;
  houseGroup.add(valveHousing);

  // 3. Ergonomic Operator Cab (Front-Left Superstructure)
  const cabGroup = new THREE.Group();
  cabGroup.position.set(0.35, 0.22, 0.78);

  // Raked Panoramic Glass Shell
  const cabShape = new THREE.Shape();
  cabShape.moveTo(-0.85, 0);
  cabShape.lineTo(0.95, 0);
  cabShape.lineTo(0.72, 1.48); // Windscreen slope
  cabShape.lineTo(-0.85, 1.48);
  cabShape.closePath();

  const cabGlassGeom = new THREE.ExtrudeGeometry(cabShape, {
    depth: 1.05,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  const glassMesh = new THREE.Mesh(cabGlassGeom, cabGlass);
  glassMesh.position.set(0, 0, -0.525);
  cabGroup.add(glassMesh);

  // ROPS Structural Steel Pillars
  const makeCabPillar = (x1: number, y1: number, x2: number, y2: number, z: number) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    const pMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, len, 8), darkChassis);
    pMesh.position.set((x1 + x2) / 2, (y1 + y2) / 2, z);
    pMesh.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
    pMesh.castShadow = true;
    cabGroup.add(pMesh);
  };

  [-0.52, 0.52].forEach((zSide) => {
    makeCabPillar(0.95, 0, 0.72, 1.48, zSide);  // A-Pillar
    makeCabPillar(0.05, 0, -0.05, 1.48, zSide);  // B-Pillar
    makeCabPillar(-0.85, 0, -0.85, 1.48, zSide); // C-Pillar
  });

  // Sculpted Yellow Roof Canopy with Visor Overhang
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-0.92, 0);
  roofShape.lineTo(0.85, 0); // Visor overhang
  roofShape.lineTo(0.82, 0.12);
  roofShape.lineTo(-0.92, 0.12);
  roofShape.closePath();

  const roofGeom = new THREE.ExtrudeGeometry(roofShape, {
    depth: 1.15,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  const roofMesh = new THREE.Mesh(roofGeom, jcbYellow);
  roofMesh.position.set(0, 1.48, -0.575);
  roofMesh.castShadow = true;
  cabGroup.add(roofMesh);

  // Dual Rooftop Work Lights
  const workLightMat = new THREE.MeshStandardMaterial({
    color: 0xEEF5FF,
    emissive: 0xCCE3F5,
    emissiveIntensity: 1.6,
  });
  [-0.35, 0.35].forEach((zSide) => {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.14), workLightMat);
    lamp.position.set(0.8, 1.45, zSide);
    cabGroup.add(lamp);
  });

  // Operator Interior: Contoured Seat & Pilot Control Joysticks
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.65, 0.46), blackTrim);
  seat.position.set(-0.25, 0.45, 0);
  const consoleL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.35, 0.14), darkChassis);
  consoleL.position.set(0.1, 0.42, 0.28);
  const consoleR = consoleL.clone();
  consoleR.position.z = -0.28;
  const joystickL = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 6), chromeRam);
  joystickL.position.set(0.18, 0.65, 0.28);
  joystickL.rotation.z = -0.2;
  const joystickR = joystickL.clone();
  joystickR.position.z = -0.28;
  cabGroup.add(seat, consoleL, consoleR, joystickL, joystickR);

  // Amber Rotating Warning Beacon
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xF59E0B,
    emissive: 0xF59E0B,
    emissiveIntensity: 2.4,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.2, 12), beaconMat);
  beacon.position.set(-0.35, 1.7, 0.35);
  cabGroup.add(beacon);

  houseGroup.add(cabGroup);
  jcb.add(houseGroup);

  // 4. Heavy Excavator Boom & Hydraulic Lift Cylinders
  const boomGroup = new THREE.Group();
  boomGroup.position.set(0.9, 1.45, -0.05);

  // Iconic Arched Mono-Boom Profile (Curved Swan-Neck Arched Box Boom)
  const boomShape = new THREE.Shape();
  boomShape.moveTo(0, 0); // Boom base pivot
  boomShape.lineTo(0.2, 0.42);
  boomShape.quadraticCurveTo(0.85, 1.75, 2.2, 1.42); // Arched crest curve
  boomShape.lineTo(2.95, 0.95); // Boom apex / dipper pivot
  boomShape.lineTo(2.85, 0.65);
  boomShape.quadraticCurveTo(0.95, 1.25, 0.35, 0.05); // Underside inner belly
  boomShape.closePath();

  const boomGeom = new THREE.ExtrudeGeometry(boomShape, {
    depth: 0.38,
    bevelEnabled: true,
    bevelThickness: 0.035,
    bevelSize: 0.025,
    bevelSegments: 3,
  });
  const boomMesh = new THREE.Mesh(boomGeom, jcbYellow);
  boomMesh.position.set(0, 0, -0.19);
  boomMesh.castShadow = true;
  boomGroup.add(boomMesh);

  // Authentic "JCB" Logo Badge on Both Flanks of Boom
  const boomBadgeL = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.85), boomBadgeMat);
  boomBadgeL.position.set(1.4, 1.28, 0.2);
  boomBadgeL.rotation.z = Math.PI / 2;
  const boomBadgeR = boomBadgeL.clone();
  boomBadgeR.position.z = -0.2;
  boomBadgeR.rotation.y = Math.PI;
  boomMesh.add(boomBadgeL, boomBadgeR);

  // Twin Hydraulic Boom Lift Cylinders (Extending from house to boom belly)
  [-0.24, 0.24].forEach((zSide) => {
    const cylBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 1.15, 10), darkChassis);
    cylBarrel.position.set(0.25, 0.35, zSide);
    cylBarrel.rotation.z = -0.75;
    const cylRod = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.95, 10), chromeRam);
    cylRod.position.set(0.65, 0.72, zSide);
    cylRod.rotation.z = -0.75;
    boomGroup.add(cylBarrel, cylRod);
  });

  // Stick Hydraulic Cylinder (Mounted along top spine of boom)
  const stickCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 1.25, 10), darkChassis);
  stickCyl.position.set(1.45, 1.68, 0);
  stickCyl.rotation.z = 0.38;
  const stickRod = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 1.05, 10), chromeRam);
  stickRod.position.set(2.05, 1.45, 0);
  stickRod.rotation.z = 0.38;
  boomGroup.add(stickCyl, stickRod);

  // Black Hydraulic Fluid Lines along Boom Spine
  const hydLine = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 2.5, 6), blackTrim);
  hydLine.position.set(1.4, 1.45, 0.18);
  hydLine.rotation.z = -0.32;
  boomGroup.add(hydLine);

  // 5. Dipper Stick (Arm) - Articulated from Boom Apex
  const stickGroup = new THREE.Group();
  stickGroup.position.set(2.9, 0.85, 0);

  // Dipper Arm Profile (Tapered Yellow Box Beam)
  const stickShape = new THREE.Shape();
  stickShape.moveTo(0, 0);
  stickShape.lineTo(0.24, 0.22);
  stickShape.lineTo(1.85, -0.65); // Down to bucket pivot
  stickShape.lineTo(1.72, -0.88);
  stickShape.lineTo(-0.08, -0.22);
  stickShape.closePath();

  const stickGeom = new THREE.ExtrudeGeometry(stickShape, {
    depth: 0.28,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  const stickMesh = new THREE.Mesh(stickGeom, jcbYellow);
  stickMesh.position.set(0, 0, -0.14);
  stickMesh.castShadow = true;
  stickGroup.add(stickMesh);

  // Bucket Hydraulic Cylinder mounted on stick
  const bCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.95, 10), darkChassis);
  bCyl.position.set(0.72, -0.05, 0);
  bCyl.rotation.z = 0.45;
  const bRod = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.75, 10), chromeRam);
  bRod.position.set(1.15, -0.25, 0);
  bRod.rotation.z = 0.45;
  stickGroup.add(bCyl, bRod);

  // Heavy Attachment Bracket / Quick-Coupler (as labeled in diagram)
  const attachBracket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.42, 0.32), darkChassis);
  attachBracket.position.set(1.65, -0.72, 0);
  stickGroup.add(attachBracket);

  // H-Linkage Dogbone Connecting Cylinder to Bucket
  const linkH = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 0.24), darkChassis);
  linkH.position.set(1.42, -0.48, 0);
  linkH.rotation.z = -0.55;
  stickGroup.add(linkH);

  // 6. Heavy Excavation Digging Bucket (Curved High-Capacity Earth Scoop)
  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(1.82, -0.82, 0);
  bucketGroup.rotation.z = 0.28; // Elevated carry posture

  const bucketShape = new THREE.Shape();
  bucketShape.moveTo(-0.1, 0.42); // Upper pin mount
  bucketShape.lineTo(0.12, 0.42);
  bucketShape.quadraticCurveTo(0.65, 0.12, 0.72, -0.45); // Curved back & floor
  bucketShape.lineTo(0.15, -0.52); // Cutting lip
  bucketShape.lineTo(-0.35, -0.22);
  bucketShape.quadraticCurveTo(-0.45, 0.15, -0.1, 0.42);
  bucketShape.closePath();

  const bucketGeom = new THREE.ExtrudeGeometry(bucketShape, {
    depth: 1.15,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  const bucketExterior = new THREE.Mesh(bucketGeom, jcbYellow);
  bucketExterior.position.set(0, 0, -0.575);
  bucketExterior.castShadow = true;

  const bucketLining = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.55, 1.08), bucketInterior);
  bucketLining.position.set(0.18, -0.1, 0);
  bucketGroup.add(bucketExterior, bucketLining);

  // 5 Heavy Cast-Steel Digging Teeth along Front Cutting Edge
  for (let z = -0.44; z <= 0.48; z += 0.22) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 4), castTeeth);
    tooth.position.set(0.12, -0.58, z);
    tooth.rotation.z = Math.PI / 2 + 0.35;
    tooth.castShadow = true;
    bucketGroup.add(tooth);
  }

  stickGroup.add(bucketGroup);
  boomGroup.add(stickGroup);
  jcb.add(boomGroup);

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

