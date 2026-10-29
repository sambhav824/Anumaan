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
  grad.addColorStop(0, "rgba(20, 24, 30, 0.55)");
  grad.addColorStop(0.5, "rgba(20, 24, 30, 0.25)");
  grad.addColorStop(1, "rgba(20, 24, 30, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 128);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

/**
 * Highly realistic, detailed 3D JCB backhoe loader with authentic industrial construction geometry:
 * - Sculpted, sloping aerodynamic engine bonnet with black intake vents & radiator grille
 * - ROPS/FOPS structural steel operator cabin with 15-degree windshield rake, tinted glass, seat, steering wheel & rearview mirrors
 * - Heavy yellow box-section chassis with side steps, fuel tank, and vertical hydraulic outrigger jacks
 * - Chrome hydraulic rams with realistic graphite cylinder barrels and flexible hydraulic hose lines
 * - Heavy-duty 4-in-1 loader bucket with 6 sharp digging teeth, torque tube, and clamshell cheek plates
 * - Rear curved swan-neck backhoe excavator boom, dipper arm, and digging bucket folded in roading configuration
 * - True construction wheels: smaller front steering wheels with industrial rib treads; massive rear drive wheels with 18 pairs of radial angled chevron V-lugs!
 * - Contact shadow patch for physical ground anchorage
 */
function createRealisticJCB() {
  const jcb = new THREE.Group();

  // Premium PBR Materials with authentic construction wear & satin sheen
  const jcbYellow = new THREE.MeshStandardMaterial({
    color: 0xF59E00, // Authentic JCB industrial construction yellow
    roughness: 0.36,
    metalness: 0.2,
  });
  const darkChassis = new THREE.MeshStandardMaterial({
    color: 0x1A1F26, // Heavy cast iron / dark structural steel
    roughness: 0.68,
    metalness: 0.6,
  });
  const blackTrim = new THREE.MeshStandardMaterial({
    color: 0x12151A,
    roughness: 0.8,
    metalness: 0.2,
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
    color: 0x162232,
    transparent: true,
    opacity: 0.6,
    roughness: 0.1,
    metalness: 0.8,
    transmission: 0.65,
  });
  const castTeeth = new THREE.MeshStandardMaterial({
    color: 0x0C0E12,
    roughness: 0.72,
    metalness: 0.5,
  });

  // 0. Soft Ground Contact Shadow (anchors machine to the terrain)
  const shadowTex = createContactShadowTexture();
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
  });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 3.2), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0.2, 0.015, 0);
  jcb.add(shadowPlane);

  // 1. Heavy Structural Chassis & Belly Frame
  const chassisGeom = new THREE.BoxGeometry(3.6, 0.65, 1.55);
  const chassis = new THREE.Mesh(chassisGeom, darkChassis);
  chassis.position.set(0, 0.92, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  jcb.add(chassis);

  // Front Heavy Cast Bumper & Tow Pin
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.58, 1.58), darkChassis);
  bumper.position.set(1.8, 0.88, 0);
  bumper.castShadow = true;
  jcb.add(bumper);

  // Side Fuel Tank & Hydraulic Reservoir
  const fuelTank = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 16), darkChassis);
  fuelTank.rotation.z = Math.PI / 2;
  fuelTank.position.set(0.1, 0.75, 0.85);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 8), chromeRam);
  cap.position.set(0.4, 0.95, 0.85);
  jcb.add(fuelTank, cap);

  // Operator Boarding Steps with Ribbed Treads & Grab Handles (both sides)
  [-0.92, 0.92].forEach((zSide) => {
    const step1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.28), blackTrim);
    step1.position.set(-0.35, 0.45, zSide);
    const step2 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.08, 0.28), blackTrim);
    step2.position.set(-0.35, 0.68, zSide * 0.95);
    const grabRail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.25, 8), darkChassis);
    grabRail.position.set(-0.68, 1.38, zSide);
    jcb.add(step1, step2, grabRail);
  });

  // Rear Vertical Outrigger Stabilizer Jacks
  [-0.96, 0.96].forEach((zSide) => {
    const jackLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.95, 10), darkChassis);
    jackLeg.position.set(-1.45, 0.82, zSide);
    const jackPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 10), chromeRam);
    jackPiston.position.set(-1.45, 0.45, zSide);
    const jackFoot = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.32), darkChassis);
    jackFoot.position.set(-1.45, 0.38, zSide);
    jcb.add(jackLeg, jackPiston, jackFoot);
  });

  // 2. Sculpted Aerodynamic Engine Bonnet & Front Cowling
  const hoodGroup = new THREE.Group();
  hoodGroup.position.set(0.95, 1.4, 0);

  // Tapered Bonnet
  const hoodMain = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.74, 1.42), jcbYellow);
  hoodMain.castShadow = true;
  hoodGroup.add(hoodMain);

  // Front Slanted Nose Cone
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.65, 1.35), jcbYellow);
  nose.position.set(0.92, -0.05, 0);
  nose.rotation.z = -0.22;
  hoodGroup.add(nose);

  // Black Radiator Intake Grille with Metallic Louver Slats
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.54, 1.22), blackTrim);
  grille.position.set(1.05, -0.06, 0);
  hoodGroup.add(grille);

  // High-Intensity Dual Rectangular Headlights + Amber Turn Indicators
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFEE,
    emissive: 0xFFE599,
    emissiveIntensity: 2.0,
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

  // Vertical Exhaust Stack with Perforated Heat Guard & Counterweighted Rain Flap
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

  // Cyclone Air Pre-Cleaner Intake (opposite side)
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
  const roof = new THREE.Mesh(new THREE.BoxGeometry(cabLength + 0.25, 0.14, cabWidth + 0.22), jcbYellow);
  roof.position.set(0, cabHeight / 2 + 0.07, 0);
  roof.castShadow = true;
  cabGroup.add(roof);

  // Roof Work Floodlights (2 forward, 2 rearward)
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

  // Exterior Convex Rearview Mirrors on Tubular Brackets
  [-cabWidth / 2 - 0.18, cabWidth / 2 + 0.18].forEach((zSide) => {
    const mirrorStem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.45, 6), darkChassis);
    mirrorStem.rotation.x = zSide > 0 ? -0.4 : 0.4;
    mirrorStem.position.set(cabLength / 2 - 0.1, 0.15, zSide * 0.9);
    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.32, 0.18), darkChassis);
    mirrorHead.position.set(cabLength / 2 - 0.08, 0.35, zSide);
    const mirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.3), mirrorChrome);
    mirrorFace.rotation.y = -Math.PI / 2;
    mirrorFace.position.set(cabLength / 2 - 0.05, 0.35, zSide);
    cabGroup.add(mirrorStem, mirrorHead, mirrorFace);
  });

  // Interior Workstation: Contoured Seat, Steering Column & Wheel
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

  // Rear Heavy Wheel Fenders & Mudflaps
  [-0.94, 0.94].forEach((zSide) => {
    const fender = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 0.44), jcbYellow);
    fender.position.set(-0.95, 1.58, zSide);
    fender.castShadow = true;
    const mudflap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.48, 0.4), blackTrim);
    mudflap.position.set(-1.8, 1.25, zSide);
    jcb.add(fender, mudflap);
  });

  // 4. Front Loader Assembly with Curved Box-Arms & Clamshell Bucket
  const loaderGroup = new THREE.Group();

  // Dual Tapered Yellow Lift Arms
  const armGeom = new THREE.BoxGeometry(1.75, 0.18, 0.14);
  const armLeft = new THREE.Mesh(armGeom, jcbYellow);
  armLeft.position.set(2.05, 1.05, 0.74);
  armLeft.rotation.z = -0.32;
  armLeft.castShadow = true;
  const armRight = armLeft.clone();
  armRight.position.z = -0.74;

  // Structural Cross-Torque Tube
  const torqueTube = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.5, 12), darkChassis);
  torqueTube.position.set(1.92, 1.15, 0);
  torqueTube.rotation.x = Math.PI / 2;

  // Hydraulic Lift Rams (cylinder barrel + chrome rod)
  const cylGeom = new THREE.CylinderGeometry(0.055, 0.055, 0.98, 10);
  const rodGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.92, 10);
  [-0.66, 0.66].forEach((zSide) => {
    const barrel = new THREE.Mesh(cylGeom, darkChassis);
    barrel.position.set(1.4, 1.25, zSide);
    barrel.rotation.z = 1.08;
    const rod = new THREE.Mesh(rodGeom, chromeRam);
    rod.position.set(1.78, 1.02, zSide);
    rod.rotation.z = 1.08;
    loaderGroup.add(barrel, rod);
  });

  // 4-in-1 Clamshell Bucket
  const bucketGeom = new THREE.BoxGeometry(0.75, 0.75, 2.05);
  const bucket = new THREE.Mesh(bucketGeom, jcbYellow);
  bucket.position.set(2.92, 0.6, 0);
  bucket.rotation.z = 0.14;
  bucket.castShadow = true;

  // Upper Spill Guard Rack
  const rack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 2.05), darkChassis);
  rack.position.set(2.7, 1.05, 0);
  loaderGroup.add(rack);

  // 6 Individually Modeled Cast-Steel Digging Teeth
  for (let z = -0.86; z <= 0.9; z += 0.35) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 4), castTeeth);
    tooth.position.set(3.32, 0.28, z);
    tooth.rotation.z = -Math.PI / 2 + 0.14;
    tooth.castShadow = true;
    loaderGroup.add(tooth);
  }

  loaderGroup.add(armLeft, armRight, torqueTube, bucket);
  jcb.add(loaderGroup);

  // 5. Rear Excavator Backhoe Arm (Swan-Neck Boom in Roading Configuration)
  const backhoeGroup = new THREE.Group();
  backhoeGroup.position.set(-1.75, 1.1, 0);

  // Kingpost Swivel Tower
  const kingpost = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.72, 0.54), darkChassis);
  backhoeGroup.add(kingpost);

  // Curved Swan-Neck Boom Arm
  const boom = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.26, 0.22), jcbYellow);
  boom.position.set(-0.68, 0.7, 0);
  boom.rotation.z = 0.82;
  boom.castShadow = true;

  // Dipper Arm (Stick folded downward)
  const dipper = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.2, 0.18), jcbYellow);
  dipper.position.set(-1.26, 0.92, 0);
  dipper.rotation.z = -1.22;
  dipper.castShadow = true;

  // Excavator Digging Bucket
  const backhoeBucket = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.44), darkChassis);
  backhoeBucket.position.set(-1.42, 0.36, 0);
  backhoeBucket.rotation.z = 0.38;
  backhoeBucket.castShadow = true;

  // 4 Excavator Teeth
  for (let bz = -0.16; bz <= 0.17; bz += 0.11) {
    const bTooth = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 4), castTeeth);
    bTooth.position.set(-1.64, 0.16, bz);
    bTooth.rotation.z = Math.PI / 2 + 0.38;
    backhoeGroup.add(bTooth);
  }

  // Hydraulic Rams & Hoses on Boom
  const bhCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.85, 8), darkChassis);
  bhCyl.position.set(-0.48, 0.98, 0);
  bhCyl.rotation.z = 0.82;
  const bhRod = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.75, 8), chromeRam);
  bhRod.position.set(-0.78, 1.28, 0);
  bhRod.rotation.z = 0.82;

  backhoeGroup.add(boom, dipper, backhoeBucket, bhCyl, bhRod);
  jcb.add(backhoeGroup);

  // 6. High-Detail Wheels with Realistic Curved Shoulders & Chevron Lugs
  const wheels: { group: THREE.Group; radius: number }[] = [];

  // Front Steer Wheel (Radius 0.45m, Width 0.36m, Ribbed industrial tread)
  const makeFrontWheel = (z: number) => {
    const wg = new THREE.Group();
    wg.position.set(1.15, 0.45, z);

    // Tread Cylinder
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.36, 24), tireRubber);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;

    // Rounded Tire Shoulders
    [-0.17, 0.17].forEach((sideZ) => {
      const shoulder = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.07, 10, 24), tireRubber);
      shoulder.position.z = sideZ;
      wg.add(shoulder);
    });

    // Yellow Steel Dish Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.37, 18), jcbYellow);
    rim.rotation.x = Math.PI / 2;

    // Dark Hub & 6 Lug Nuts
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.39, 10), darkChassis);
    hub.rotation.x = Math.PI / 2;

    // 6 Hex Wheel Nuts
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 6), darkChassis);
      nut.rotation.x = Math.PI / 2;
      nut.position.set(Math.cos(a) * 0.18, Math.sin(a) * 0.18, 0.19 * (z > 0 ? 1 : -1));
      wg.add(nut);
    }

    wg.add(tire, rim, hub);
    jcb.add(wg);
    wheels.push({ group: wg, radius: 0.45 });
  };

  // Rear Heavy Drive Wheel (Radius 0.76m, Width 0.56m, 18 Pairs of Chevron V-Lugs!)
  const makeRearWheel = (z: number) => {
    const wg = new THREE.Group();
    wg.position.set(-0.95, 0.76, z);

    // Main Tire Body
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

    // Planetary Gear Reduction Hub
    const planetary = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.61, 12), darkChassis);
    planetary.rotation.x = Math.PI / 2;

    wg.add(tire, rim, planetary);

    // 18 Pairs of Angled Chevron Earthmoving Lugs in V-Pattern
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
    // Perfectly frames "WELCOME TO  [FULL ANUMAAN LOGO]" and the parked JCB
    const isMobile = width < 768;
    const camera = new THREE.PerspectiveCamera(isMobile ? 48 : 37, width / height, 0.1, 120);
    camera.position.set(0.6, isMobile ? 4.2 : 3.8, isMobile ? 15.2 : 13.2);
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
    // Follows the rear print point of the JCB!
    const clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -25);

    // 7. Freestanding Upright 3D Letters: "WELCOME TO"
    // Generously spaced from the upcoming Anumaan Logo
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

    // Layout: "WELCOME" from -8.2 to -2.7, "TO" from -2.1 to -0.65
    // Generous 1.5m gap before the Anumaan Logo begins at +0.85!
    const words = [
      { text: "WELCOME", startX: -8.2 },
      { text: "TO", startX: -2.1 },
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
    // Positioned with generous spacing after "TO" (starts at X = +0.85, giving 1.5m visual breathing room!)
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

    // Logo Dimensions (exact 2:1 aspect ratio of official artwork)
    const logoWidth = 4.8;
    const logoHeight = 2.4;
    const logoStartX = 0.85; // Increased spacing between WELCOME TO and Logo
    const logoCenterX = logoStartX + logoWidth / 2; // +3.25
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

    // 9. Realistic 3D Yellow JCB Backhoe Loader
    const { jcb, wheels, beacon } = createRealisticJCB();
    jcb.position.z = 0.82;
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

    const startX = -14.0;
    const stopX = 9.8; // Smoothly stops on right with entire composition visible
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
            positions[i * 3 + 2] = 0.8 + (Math.random() - 0.5) * 1.8;

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
      camera.fov = mobile ? 48 : 37;
      camera.position.set(0.6, mobile ? 4.2 : 3.8, mobile ? 15.2 : 13.2);
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
