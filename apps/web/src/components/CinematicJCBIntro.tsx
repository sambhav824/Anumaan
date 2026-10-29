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

  // Minor grid
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

  // Major architectural grid
  ctx.strokeStyle = "#D8D0C3";
  ctx.lineWidth = 1.8;
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

  // Engineering coordinate markers
  ctx.fillStyle = "#9C9283";
  ctx.font = "bold 13px 'Courier New', monospace";
  for (let x = majorStep; x < 1024; x += majorStep * 2) {
    for (let y = majorStep; y < 1024; y += majorStep * 2) {
      ctx.fillText("+", x - 4, y + 5);
      ctx.font = "9px 'Courier New', monospace";
      ctx.fillText(`${(x / 64).toFixed(1)}m`, x + 7, y + 13);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 4);
  return texture;
}

/**
 * Creates soft contact shadow texture under the machine for natural grounding.
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(128, 64, 10, 128, 64, 60);
  grad.addColorStop(0, "rgba(20, 24, 30, 0.6)");
  grad.addColorStop(0.5, "rgba(20, 24, 30, 0.28)");
  grad.addColorStop(1, "rgba(20, 24, 30, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Generates official authentic JCB black/yellow brand badge textures.
 */
function createJcbArmBadgeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#F59E00";
  ctx.fillRect(0, 0, 256, 80);

  // Black badge container
  ctx.fillStyle = "#16191E";
  ctx.beginPath();
  ctx.roundRect(12, 10, 232, 60, 8);
  ctx.fill();

  // Bold white/yellow JCB lettering
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "900 44px 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("JCB", 128, 41);

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

  // Bold vertical black JCB lettering
  ctx.fillStyle = "#16191E";
  ctx.font = "900 52px 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.save();
  ctx.translate(80, 110);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("JCB", 0, 0);
  ctx.restore();

  // 3DX badge at top
  ctx.fillStyle = "#16191E";
  ctx.beginPath();
  ctx.roundRect(24, 180, 112, 48, 6);
  ctx.fill();

  ctx.fillStyle = "#F59E00";
  ctx.font = "bold 26px 'Arial Black', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("3DX", 80, 204);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Highly realistic, detailed 3D JCB 3DX EcoXpert backhoe loader modeled directly from
 * the official reference image:
 * - Raised 4-in-1 loader arms & elevated bucket posture with black spill-guard and 6 digging teeth
 * - Authentic bold "JCB" branding on both loader arms and rear backhoe boom
 * - Sloping aerodynamic yellow engine bonnet with black lower louvered grille
 * - ROPS/FOPS structural steel cabin with tinted panoramic glass, roof visor, floodlights & tall rearview mirror
 * - Curved rear mudguards over giant drive wheels with 18 pairs of directional chevron traction lugs
 * - Heavy yellow rear backhoe swan-neck boom, dipper stick & curled excavator bucket
 * - Authentic yellow dish rims with black central hubs and planetary gear reductions
 */
function createRealisticJCB() {
  const jcb = new THREE.Group();

  // PBR Materials reflecting authentic JCB industrial construction finish
  const jcbYellow = new THREE.MeshStandardMaterial({
    color: 0xF59E00, // Iconic JCB 3DX construction yellow
    roughness: 0.35,
    metalness: 0.22,
  });
  const darkChassis = new THREE.MeshStandardMaterial({
    color: 0x1A1F26, // Heavy cast structural iron / black chassis
    roughness: 0.65,
    metalness: 0.6,
  });
  const blackTrim = new THREE.MeshStandardMaterial({
    color: 0x13161A,
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
    color: 0x162434,
    transparent: true,
    opacity: 0.62,
    roughness: 0.1,
    metalness: 0.8,
    transmission: 0.65,
  });
  const bucketInterior = new THREE.MeshStandardMaterial({
    color: 0x1E2228,
    roughness: 0.75,
    metalness: 0.45,
  });
  const castTeeth = new THREE.MeshStandardMaterial({
    color: 0x0D0F12,
    roughness: 0.7,
    metalness: 0.55,
  });

  // Badge Materials
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
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.4), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0.2, 0.015, 0);
  jcb.add(shadowPlane);

  // 1. Heavy Structural Chassis & Undercarriage Frame
  const chassisGeom = new THREE.BoxGeometry(3.65, 0.68, 1.55);
  const chassis = new THREE.Mesh(chassisGeom, darkChassis);
  chassis.position.set(0, 0.92, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  jcb.add(chassis);

  // Front Heavy Cast Bumper & Tow Pin
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.6, 1.58), darkChassis);
  bumper.position.set(1.8, 0.88, 0);
  bumper.castShadow = true;
  jcb.add(bumper);

  // Side Fuel Tank & Hydraulic Reservoir with Cap
  const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.95, 16), darkChassis);
  fuelTank.rotation.z = Math.PI / 2;
  fuelTank.position.set(0.12, 0.75, 0.86);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), chromeRam);
  cap.position.set(0.42, 0.95, 0.86);
  jcb.add(fuelTank, cap);

  // Operator Boarding Steps with Ribbed Treads & Grab Handles (both sides)
  [-0.92, 0.92].forEach((zSide) => {
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.28), blackTrim);
    step1.position.set(-0.35, 0.45, zSide);
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.28), blackTrim);
    step2.position.set(-0.35, 0.68, zSide * 0.95);
    const grabRail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.25, 8), darkChassis);
    grabRail.position.set(-0.68, 1.38, zSide);
    jcb.add(step1, step2, grabRail);
  });

  // Rear Vertical Outrigger Stabilizer Jacks (with authentic yellow ground pads as seen in reference image!)
  [-0.96, 0.96].forEach((zSide) => {
    const jackLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 10), darkChassis);
    jackLeg.position.set(-1.45, 0.82, zSide);
    const jackPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.45, 10), chromeRam);
    jackPiston.position.set(-1.45, 0.45, zSide);
    const jackFoot = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.08, 0.35), jcbYellow);
    jackFoot.position.set(-1.45, 0.38, zSide);
    jcb.add(jackLeg, jackPiston, jackFoot);
  });

  // 2. Sloping Aerodynamic Engine Bonnet & Front Cowling
  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0.95, 1.4, 0);

  // Tapered Yellow Bonnet
  const hoodMain = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.74, 1.42), jcbYellow);
  hoodMain.castShadow = true;
  hoodGroup.add(hoodMain);

  // Front Slanted Nose Cone
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.66, 1.35), jcbYellow);
  nose.position.set(0.92, -0.05, 0);
  nose.rotation.z = -0.22;
  hoodGroup.add(nose);

  // Black Lower Louvered Grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.54, 1.24), blackTrim);
  grille.position.set(1.06, -0.06, 0);
  hoodGroup.add(grille);

  // Dual Headlights & Amber Turn Indicators
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
    hlHousing.position.set(1.02, 0.06, zSide);
    const hlLens = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.14, 0.22), hlMat);
    hlLens.position.set(1.06, 0.06, zSide);
    const indLens = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.1, 0.1), indMat);
    indLens.position.set(1.06, 0.06, zSide + (zSide > 0 ? 0.18 : -0.18));
    hoodGroup.add(hlHousing, hlLens, indLens);
  });

  // Vertical Exhaust Stack with Rain Flap
  const exhaustGroup = new THREE.Group();
  exhaustGroup.position.set(0.38, 2.15, 0.68);
  const exhaustPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.45, 12), darkChassis);
  const exhaustGuard = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.95, 12), castTeeth);
  exhaustGuard.position.y = -0.15;
  const exhaustFlap = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.02, 0.09), chromeRam);
  exhaustFlap.position.set(0, 0.74, 0);
  exhaustFlap.rotation.z = 0.35;
  exhaustGroup.add(exhaustPipe, exhaustGuard, exhaustFlap);
  jcb.add(exhaustGroup);

  // Cyclone Air Pre-Cleaner Snorkel (opposite side)
  const snorkel = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.25, 10), darkChassis);
  snorkel.position.set(0.38, 2.05, -0.68);
  const preCleanerBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.18, 12), darkChassis);
  preCleanerBowl.position.set(0.38, 2.7, -0.68);
  jcb.add(snorkel, preCleanerBowl);

  jcb.add(hoodGroup);

  // 3. Fully Enclosed ROPS/FOPS Operator Cabin
  const cabGroup = new THREE.Group();
  const cabLength = 1.48;
  const cabWidth = 1.34;
  const cabHeight = 1.54;
  const cabCenterY = 1.38 + cabHeight / 2;
  cabGroup.position.set(-0.52, cabCenterY, 0);

  // Tinted Panoramic Glass Windows
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(cabLength - 0.05, cabHeight - 0.05, cabWidth - 0.05),
    cabGlass
  );
  cabGroup.add(glass);

  // 6 Structural Roll-Cage Steel Pillars
  const pillarGeom = new THREE.CylinderGeometry(0.04, 0.04, cabHeight, 8);
  const pillarOffsets = [
    [cabLength / 2, cabWidth / 2],
    [cabLength / 2, -cabWidth / 2],
    [0, cabWidth / 2],
    [0, -cabWidth / 2],
    [-cabLength / 2, cabWidth / 2],
    [-cabLength / 2, -cabWidth / 2],
  ];
  pillarOffsets.forEach(([ox, oz]) => {
    const pillar = new THREE.Mesh(pillarGeom, darkChassis);
    pillar.position.set(ox, 0, oz);
    pillar.castShadow = true;
    cabGroup.add(pillar);
  });

  // Sculpted Yellow Roof Canopy with Visor Overhang
  const roof = new THREE.Mesh(new THREE.BoxGeometry(cabLength + 0.26, 0.14, cabWidth + 0.22), jcbYellow);
  roof.position.set(0, cabHeight / 2 + 0.07, 0);
  roof.castShadow = true;
  cabGroup.add(roof);

  // Roof Work Floodlights
  const workLightMat = new THREE.MeshStandardMaterial({
    color: 0xEEF5FF,
    emissive: 0xCCE3F5,
    emissiveIntensity: 1.4,
  });
  [-0.45, 0.45].forEach((zSide) => {
    const fLamp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.15), workLightMat);
    fLamp.position.set(cabLength / 2 + 0.12, cabHeight / 2 + 0.07, zSide);
    const rLamp = fLamp.clone();
    rLamp.position.x = -cabLength / 2 - 0.12;
    cabGroup.add(fLamp, rLamp);
  });

  // Tall Exterior Rearview Mirror on Curved Stalk (exactly like reference image!)
  [-cabWidth / 2 - 0.2, cabWidth / 2 + 0.2].forEach((zSide) => {
    const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.55, 6), darkChassis);
    mirrorStem.rotation.x = zSide > 0 ? -0.45 : 0.45;
    mirrorStem.rotation.z = -0.2;
    mirrorStem.position.set(cabLength / 2 - 0.08, 0.25, zSide * 0.9);
    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.35, 0.2), darkChassis);
    mirrorHead.position.set(cabLength / 2 - 0.05, 0.5, zSide);
    const mirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.32), mirrorChrome);
    mirrorFace.rotation.y = -Math.PI / 2;
    mirrorFace.position.set(cabLength / 2 - 0.02, 0.5, zSide);
    cabGroup.add(mirrorStem, mirrorHead, mirrorFace);
  });

  // Interior: Contoured Seat, Steering Column & Wheel
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.44), blackTrim);
  seat.position.set(-0.12, -0.32, 0);
  const steeringPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.7, 8), darkChassis);
  steeringPost.position.set(0.38, -0.25, 0);
  steeringPost.rotation.z = -0.42;
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 8, 16), blackTrim);
  wheelRim.position.set(0.26, 0.02, 0);
  wheelRim.rotation.y = Math.PI / 2;
  wheelRim.rotation.x = -0.42;
  cabGroup.add(seat, steeringPost, wheelRim);

  // Amber Rotating Warning Beacon with Glass Dome
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xF59E0B,
    emissive: 0xF59E0B,
    emissiveIntensity: 2.4,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.2, 12), beaconMat);
  beacon.position.set(0, cabHeight / 2 + 0.22, 0.38);
  cabGroup.add(beacon);

  jcb.add(cabGroup);

  // Rear Heavy Curved Mudguards & Mudflaps
  [-0.95, 0.95].forEach((zSide) => {
    const fender = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.14, 0.46), jcbYellow);
    fender.position.set(-0.95, 1.58, zSide);
    fender.castShadow = true;
    const mudflap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.42), blackTrim);
    mudflap.position.set(-1.82, 1.25, zSide);
    jcb.add(fender, mudflap);
  });

  // 4. Front Loader Assembly (Elevated Construction Posture as in Reference Image!)
  const loaderGroup = new THREE.Group();

  // Dual Tapered Yellow Lift Arms (Pivoting up from chassis tower)
  const armGeom = new THREE.BoxGeometry(1.9, 0.2, 0.15);
  const armLeft = new THREE.Mesh(armGeom, jcbYellow);
  armLeft.position.set(1.95, 1.35, 0.74);
  armLeft.rotation.z = 0.22; // Elevated posture matching photo
  armLeft.castShadow = true;

  // Authentic "JCB" Logo Badge on Side of Loader Arm!
  const armBadge = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.24), armBadgeMat);
  armBadge.position.set(0.1, 0, 0.08);
  armBadge.rotation.y = 0;
  armLeft.add(armBadge);

  const armRight = armLeft.clone();
  armRight.position.z = -0.74;

  // Structural Cross-Torque Tube
  const torqueTube = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1.5, 12), darkChassis);
  torqueTube.position.set(1.85, 1.45, 0);
  torqueTube.rotation.x = Math.PI / 2;

  // Hydraulic Lift Rams (cylinder barrel + chrome rod)
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

  // 4-in-1 Clamshell Bucket (Elevated and Tilted Up as in Reference Photo)
  const bucketGroup = new THREE.Group();
  bucketGroup.position.set(2.88, 1.62, 0);
  bucketGroup.rotation.z = 0.42; // Tilted upward carry angle

  // Bucket Shell (Yellow exterior, dark interior)
  const bucketExterior = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.78, 2.08), jcbYellow);
  bucketExterior.castShadow = true;
  const bucketLining = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 2.02), bucketInterior);
  bucketLining.position.x = -0.04;
  bucketGroup.add(bucketExterior, bucketLining);

  // Black Top Spill Guard
  const spillGuard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.32, 2.08), blackTrim);
  spillGuard.position.set(-0.25, 0.45, 0);
  bucketGroup.add(spillGuard);

  // 6 Individually Modeled Cast-Steel Digging Teeth
  for (let z = -0.88; z <= 0.92; z += 0.36) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.26, 4), castTeeth);
    tooth.position.set(0.48, -0.38, z);
    tooth.rotation.z = -Math.PI / 2;
    tooth.castShadow = true;
    bucketGroup.add(tooth);
  }

  loaderGroup.add(armLeft, armRight, torqueTube, bucketGroup);
  jcb.add(loaderGroup);

  // 5. Rear Excavator Backhoe Arm with Iconic Swan-Neck Boom & "JCB 3DX" Branding!
  const backhoeGroup = new THREE.Group();
  backhoeGroup.position.set(-1.75, 1.1, 0);

  // Heavy Kingpost Swivel Tower
  const kingpost = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.74, 0.56), jcbYellow);
  backhoeGroup.add(kingpost);

  // Swan-Neck Curved Main Boom Arm
  const boomGroup = new THREE.Group();
  boomGroup.position.set(-0.7, 0.72, 0);
  boomGroup.rotation.z = 0.85;

  const boomMain = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.28, 0.24), jcbYellow);
  boomMain.castShadow = true;
  boomGroup.add(boomMain);

  // Bold "JCB 3DX" Decal Badge on Boom Side!
  const boomBadgeL = new THREE.Mesh(new THREE.PlaneGeometry(0.48, 0.75), boomBadgeMat);
  boomBadgeL.position.set(0.1, 0, 0.13);
  boomBadgeL.rotation.y = 0;
  boomBadgeL.rotation.z = Math.PI / 2;
  const boomBadgeR = boomBadgeL.clone();
  boomBadgeR.position.z = -0.13;
  boomBadgeR.rotation.y = Math.PI;
  boomGroup.add(boomBadgeL, boomBadgeR);

  // Dipper Arm (Stick folded downward)
  const dipper = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.18), jcbYellow);
  dipper.position.set(-1.3, 0.95, 0);
  dipper.rotation.z = -1.22;
  dipper.castShadow = true;

  // Dark Excavator Digging Bucket (Folded in roading position)
  const backhoeBucket = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.52, 0.46), darkChassis);
  backhoeBucket.position.set(-1.46, 0.38, 0);
  backhoeBucket.rotation.z = 0.4;
  backhoeBucket.castShadow = true;

  // 4 Backhoe Digging Teeth
  for (let bz = -0.16; bz <= 0.18; bz += 0.11) {
    const bTooth = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 4), castTeeth);
    bTooth.position.set(-1.7, 0.18, bz);
    bTooth.rotation.z = Math.PI / 2 + 0.4;
    backhoeGroup.add(bTooth);
  }

  // Hydraulic Ram along top curve of boom
  const bhCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.9, 8), darkChassis);
  bhCyl.position.set(-0.48, 1.02, 0);
  bhCyl.rotation.z = 0.85;
  const bhRod = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.8, 8), chromeRam);
  bhRod.position.set(-0.8, 1.35, 0);
  bhRod.rotation.z = 0.85;

  backhoeGroup.add(boomGroup, dipper, backhoeBucket, bhCyl, bhRod);
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

    // WebGL capability check
    const canvasTest = document.createElement("canvas");
    const gl = canvasTest.getContext("webgl") || canvasTest.getContext("experimental-webgl");
    if (!gl) {
      setHasWebGLError(true);
      return;
    }

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene & Atmosphere
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#F6F3EE");
    scene.fog = new THREE.FogExp2(0xF6F3EE, 0.012);

    // 2. Camera Setup: Elevated 3/4 architectural viewpoint
    // Calibrated with generous spacing to frame "WELCOME TO" and the Anumaan Logo
    const isMobile = width < 768;
    const camera = new THREE.PerspectiveCamera(isMobile ? 50 : 38, width / height, 0.1, 120);
    camera.position.set(0.6, isMobile ? 4.2 : 3.8, isMobile ? 15.8 : 13.6);
    camera.lookAt(0.6, 1.15, 0);

    // 3. Renderer with local clipping enabled
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

    // 4. Lighting: Soft ambient sky and warm directional sunlight
    const ambientLight = new THREE.AmbientLight(0xFFFBF2, 0.95);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xFFF5DC, 1.45);
    sunLight.position.set(14, 18, 12);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 45;
    sunLight.shadow.camera.left = -18;
    sunLight.shadow.camera.right = 18;
    sunLight.shadow.camera.top = 10;
    sunLight.shadow.camera.bottom = -10;
    sunLight.shadow.bias = -0.0003;
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0xD6E8FA, 0.35);
    fillLight.position.set(-12, 8, -8);
    scene.add(fillLight);

    // 5. Ground Plane with Architectural Grid
    const groundTexture = createGroundTexture();
    const groundMaterial = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.88,
      metalness: 0.04,
    });
    const groundGeom = new THREE.PlaneGeometry(80, 50);
    const ground = new THREE.Mesh(groundGeom, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    scene.add(ground);

    // 6. Dynamic Clipping Plane for Position-Synchronized Reveal
    // Normal (-1, 0, 0): any geometry with X > constant is clipped out.
    const clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -25);

    // 7. Freestanding Upright 3D Letters: "WELCOME TO"
    const textGroup = new THREE.Group();
    scene.add(textGroup);

    const letterFrontMat = new THREE.MeshStandardMaterial({
      color: 0x1A222E, // Deep charcoal concrete
      roughness: 0.65,
      metalness: 0.18,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });
    const letterSideMat = new THREE.MeshStandardMaterial({
      color: 0x2A3545, // Stone side facets
      roughness: 0.55,
      metalness: 0.22,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });
    const letterMaterials = [letterFrontMat, letterSideMat];

    // Layout: "WELCOME" from -8.6 to -3.1, "TO" from -2.3 to -0.85
    // Generous 2.0m spacing gap before the Anumaan Logo begins at +1.15!
    const words = [
      { text: "WELCOME", startX: -8.6 },
      { text: "TO", startX: -2.3 },
    ];

    const letterHeight = 1.15;
    const letterWidth = 0.68;
    const letterDepth = 0.32;
    const letterSpacing = 0.16;

    words.forEach((w) => {
      let curX = w.startX;
      for (let i = 0; i < w.text.length; i++) {
        const char = w.text[i];
        const shape = createLetterShape(char, letterWidth, letterHeight);
        const geom = new THREE.ExtrudeGeometry(shape, {
          depth: letterDepth,
          bevelEnabled: true,
          bevelThickness: 0.035,
          bevelSize: 0.025,
          bevelSegments: 3,
        });

        const mesh = new THREE.Mesh(geom, letterMaterials);
        mesh.rotation.x = -0.05;
        mesh.position.set(curX, 0, -0.4);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        textGroup.add(mesh);

        curX += letterWidth + letterSpacing;
      }
    });

    // 8. Official Complete Anumaan Brand Logo Presentation
    // Positioned with generous 2.0m spacing after "TO" (starts at X = +1.15!)
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
    const logoStartX = 1.15; // Increased generous spacing between WELCOME TO and Logo
    const logoCenterX = logoStartX + logoWidth / 2; // +3.55
    const logoCenterY = logoHeight / 2 + 0.05;

    // Architectural Sign Monument Backing Panel (Freestanding on ground)
    const signFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1A222E,
      roughness: 0.5,
      metalness: 0.4,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });
    const signBoardMat = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      roughness: 0.3,
      metalness: 0.05,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });

    // Ground Plinth Base
    const plinthGeom = new THREE.BoxGeometry(logoWidth + 0.25, 0.1, 0.4);
    const plinth = new THREE.Mesh(plinthGeom, signFrameMat);
    plinth.position.set(logoCenterX, 0.05, -0.4);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    logoGroup.add(plinth);

    // Signboard Frame
    const boardGeom = new THREE.BoxGeometry(logoWidth + 0.12, logoHeight + 0.12, 0.12);
    const boardFrame = new THREE.Mesh(boardGeom, signFrameMat);
    boardFrame.position.set(logoCenterX, logoCenterY, -0.4);
    boardFrame.castShadow = true;
    boardFrame.receiveShadow = true;
    logoGroup.add(boardFrame);

    // White Inset Board
    const insetGeom = new THREE.BoxGeometry(logoWidth, logoHeight, 0.122);
    const insetBoard = new THREE.Mesh(insetGeom, signBoardMat);
    insetBoard.position.set(logoCenterX, logoCenterY, -0.4);
    logoGroup.add(insetBoard);

    // Official Anumaan Logo Artwork Quad
    const logoFaceMat = new THREE.MeshStandardMaterial({
      map: logoTexture,
      transparent: true,
      roughness: 0.25,
      metalness: 0.05,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });
    const logoPlaneGeom = new THREE.PlaneGeometry(logoWidth * 0.96, logoHeight * 0.96);
    const logoMesh = new THREE.Mesh(logoPlaneGeom, logoFaceMat);
    logoMesh.position.set(logoCenterX, logoCenterY, -0.33);
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
    const stopX = 10.2; // Smoothly stops on right with entire composition visible
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

      {/* Final Cinematic Brand Card (Fades in when JCB completes the reveal) */}
      {phase === "completed" && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-30 pointer-events-none animate-in fade-in zoom-in-95 duration-500">
          <div className="max-w-md w-full bg-white/95 backdrop-blur-lg border border-[#DCE4EE] p-6 sm:p-8 rounded-3xl shadow-2xl pointer-events-auto text-center space-y-5">
            <div className="flex justify-center">
              <Image
                src="/assets/anumaan-logo.png"
                alt="Anumaan Logo"
                width={190}
                height={95}
                className="h-14 w-auto object-contain"
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

            {/* Feature Highlights */}
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

            {/* Action Buttons */}
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
