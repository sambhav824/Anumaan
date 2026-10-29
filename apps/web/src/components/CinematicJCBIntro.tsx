"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import * as THREE from "three";
import { ArrowRight, RotateCcw, Building2, HardHat, FileSpreadsheet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * Procedural vector shapes for uppercase architectural lettering.
 * Every letter is defined in upright 2D coordinates:
 * bottom at y = 0, top at y = height, width = width.
 */
function createLetterShape(char: string, w = 0.72, h = 1.05): THREE.Shape {
  const shape = new THREE.Shape();
  const t = 0.17; // Clean architectural stroke thickness

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

    case "A": {
      shape.moveTo(0, 0);
      shape.lineTo(w * 0.35, h);
      shape.lineTo(w * 0.65, h);
      shape.lineTo(w, 0);
      shape.lineTo(w - t, 0);
      shape.lineTo(w * 0.72, h * 0.38);
      shape.lineTo(w * 0.28, h * 0.38);
      shape.lineTo(t, 0);
      shape.closePath();

      const holeA = new THREE.Path();
      holeA.moveTo(w * 0.34, h * 0.52);
      holeA.lineTo(w * 0.5, h * 0.82);
      holeA.lineTo(w * 0.66, h * 0.52);
      holeA.closePath();
      shape.holes.push(holeA);
      return shape;
    }

    case "N": {
      shape.moveTo(0, 0);
      shape.lineTo(t, 0);
      shape.lineTo(w - t * 1.15, h - t * 1.45);
      shape.lineTo(w - t * 1.15, 0);
      shape.lineTo(w, 0);
      shape.lineTo(w, h);
      shape.lineTo(w - t, h);
      shape.lineTo(t * 1.15, t * 1.45);
      shape.lineTo(t * 1.15, h);
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
 * Procedural ground texture with subtle architectural construction grid.
 */
function createGroundTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d")!;

  // Warm light beige/cream foundation
  ctx.fillStyle = "#F5F2EC";
  ctx.fillRect(0, 0, 1024, 1024);

  // Subtle minor grid
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

  // Major grid
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

  // Engineering crosshairs
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
 * Builds a realistic, highly detailed 3D yellow JCB backhoe loader.
 * Features:
 * - Proper construction equipment proportions
 * - Heavy yellow chassis with beveled hood and radiator grille
 * - Fully enclosed ROPS/FOPS operator cabin with tinted glass, roll-cage pillars, seat, and steering wheel
 * - Rear curved mudguards with mudflaps & side operator steps
 * - Twin vertical outrigger stabilizer jacks
 * - Chrome hydraulic cylinders and hoses
 * - Articulated front loader arms with 4-in-1 bucket and 6 digging teeth
 * - Realistic rear backhoe excavator arm folded in roading configuration
 * - Large rear tractor drive wheels with 16 pairs of radial chevron tread lugs!
 * - Smaller front steering wheels with industrial rib treads and yellow dish rims
 */
function createRealisticJCB() {
  const jcb = new THREE.Group();

  // Materials with authentic PBR properties
  const jcbYellow = new THREE.MeshStandardMaterial({
    color: 0xF5A800, // Iconic JCB construction yellow
    roughness: 0.32,
    metalness: 0.25,
  });
  const darkChassis = new THREE.MeshStandardMaterial({
    color: 0x1A1F26, // Heavy cast dark industrial steel
    roughness: 0.65,
    metalness: 0.55,
  });
  const chromeRam = new THREE.MeshStandardMaterial({
    color: 0xF0F4F8,
    roughness: 0.08,
    metalness: 0.95,
  });
  const tireRubber = new THREE.MeshStandardMaterial({
    color: 0x16181B, // Matte vulcanized carbon black rubber
    roughness: 0.88,
    metalness: 0.08,
  });
  const cabGlass = new THREE.MeshPhysicalMaterial({
    color: 0x1A2636,
    transparent: true,
    opacity: 0.55,
    roughness: 0.12,
    metalness: 0.85,
    transmission: 0.6,
  });
  const castSteel = new THREE.MeshStandardMaterial({
    color: 0x0F1318,
    roughness: 0.75,
    metalness: 0.45,
  });

  // 1. Lower Chassis & Main Belly Pan
  const chassisGeom = new THREE.BoxGeometry(3.6, 0.65, 1.55);
  const chassis = new THREE.Mesh(chassisGeom, darkChassis);
  chassis.position.set(0, 0.92, 0);
  chassis.castShadow = true;
  chassis.receiveShadow = true;
  jcb.add(chassis);

  // Front Heavy Bumper / Counterweight
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 1.58), darkChassis);
  bumper.position.set(1.78, 0.88, 0);
  bumper.castShadow = true;
  jcb.add(bumper);

  // Side Operator Boarding Steps (both sides)
  [-0.92, 0.92].forEach((zSide) => {
    const stepBox = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.1, 0.28), darkChassis);
    stepBox.position.set(-0.35, 0.48, zSide);
    const grabRail = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 8), darkChassis);
    grabRail.position.set(-0.65, 1.35, zSide);
    jcb.add(stepBox, grabRail);
  });

  // Rear Vertical Outrigger Stabilizer Jacks
  [-0.96, 0.96].forEach((zSide) => {
    const jackLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.9, 10), darkChassis);
    jackLeg.position.set(-1.45, 0.8, zSide);
    const jackFoot = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.06, 0.28), darkChassis);
    jackFoot.position.set(-1.45, 0.38, zSide);
    jcb.add(jackLeg, jackFoot);
  });

  // 2. Engine Hood & Front Grille
  const hoodGeom = new THREE.BoxGeometry(1.65, 0.72, 1.42);
  const hood = new THREE.Mesh(hoodGeom, jcbYellow);
  hood.position.set(0.95, 1.42, 0);
  hood.castShadow = true;
  jcb.add(hood);

  // Radiator Front Louvered Grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.56, 1.25), darkChassis);
  grille.position.set(1.79, 1.38, 0);
  jcb.add(grille);

  // Dual Headlights & Indicators
  const hlMat = new THREE.MeshStandardMaterial({
    color: 0xFFFFEE,
    emissive: 0xFFE082,
    emissiveIntensity: 1.8,
  });
  const indicatorMat = new THREE.MeshStandardMaterial({
    color: 0xF59E0B,
    emissive: 0xD97706,
    emissiveIntensity: 1.2,
  });
  [-0.48, 0.48].forEach((zSide) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.24), hlMat);
    hl.position.set(1.78, 1.48, zSide);
    const ind = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.1), indicatorMat);
    ind.position.set(1.78, 1.48, zSide + (zSide > 0 ? 0.2 : -0.2));
    jcb.add(hl, ind);
  });

  // Vertical Exhaust Stack with Rain Flap & Heat Shield
  const exhaust = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1.4, 12), darkChassis);
  exhaust.position.set(0.38, 2.15, 0.68);
  const exhaustShield = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 12), castSteel);
  exhaustShield.position.set(0.38, 1.95, 0.68);
  const flap = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.09), chromeRam);
  flap.position.set(0.38, 2.87, 0.68);
  flap.rotation.z = 0.35;
  jcb.add(exhaust, exhaustShield, flap);

  // 3. Enclosed Operator Cabin
  const cabLength = 1.45;
  const cabWidth = 1.32;
  const cabHeight = 1.5;
  const cabCenterY = 1.38 + cabHeight / 2;

  // Smoked Panoramic Glass
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(cabLength - 0.04, cabHeight - 0.04, cabWidth - 0.04),
    cabGlass
  );
  glass.position.set(-0.52, cabCenterY, 0);
  jcb.add(glass);

  // 6 Structural ROPS/FOPS Safety Pillars
  const pillarGeom = new THREE.CylinderGeometry(0.038, 0.038, cabHeight, 8);
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
    pillar.position.set(-0.52 + ox, cabCenterY, oz);
    pillar.castShadow = true;
    jcb.add(pillar);
  });

  // Cab Roof with Overhang
  const roof = new THREE.Mesh(new THREE.BoxGeometry(cabLength + 0.22, 0.12, cabWidth + 0.22), jcbYellow);
  roof.position.set(-0.52, cabCenterY + cabHeight / 2 + 0.06, 0);
  roof.castShadow = true;
  jcb.add(roof);

  // Roof Work Floodlights (2 front, 2 rear)
  const workLightMat = new THREE.MeshStandardMaterial({
    color: 0xEEF5FF,
    emissive: 0xCCE3F5,
    emissiveIntensity: 1.2,
  });
  [-0.45, 0.45].forEach((zSide) => {
    const frontLamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.14), workLightMat);
    frontLamp.position.set(-0.52 + cabLength / 2 + 0.1, cabCenterY + cabHeight / 2 + 0.06, zSide);
    const rearLamp = frontLamp.clone();
    rearLamp.position.x = -0.52 - cabLength / 2 - 0.1;
    jcb.add(frontLamp, rearLamp);
  });

  // Amber Rotating Warning Beacon
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xF59E0B,
    emissive: 0xF59E0B,
    emissiveIntensity: 2.2,
  });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.18, 12), beaconMat);
  beacon.position.set(-0.52, cabCenterY + cabHeight / 2 + 0.2, 0.38);
  jcb.add(beacon);

  // Cabin Interior: Seat & Steering Column
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.42), darkChassis);
  seat.position.set(-0.62, 1.62, 0);
  const steeringPost = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.65, 8), darkChassis);
  steeringPost.position.set(-0.15, 1.7, 0);
  steeringPost.rotation.z = -0.4;
  const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 16), darkChassis);
  wheelRim.position.set(-0.25, 1.95, 0);
  wheelRim.rotation.y = Math.PI / 2;
  wheelRim.rotation.x = -0.4;
  jcb.add(seat, steeringPost, wheelRim);

  // Rear Heavy Wheel Fenders
  [-0.92, 0.92].forEach((zSide) => {
    const fender = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.1, 0.42), jcbYellow);
    fender.position.set(-0.95, 1.55, zSide);
    const mudflap = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.45, 0.38), darkChassis);
    mudflap.position.set(-1.75, 1.25, zSide);
    jcb.add(fender, mudflap);
  });

  // 4. Front Loader Assembly
  const loaderGroup = new THREE.Group();

  // Arched Lift Arms (left and right)
  const armGeom = new THREE.BoxGeometry(1.7, 0.16, 0.12);
  const armLeft = new THREE.Mesh(armGeom, jcbYellow);
  armLeft.position.set(2.05, 1.05, 0.74);
  armLeft.rotation.z = -0.32;
  const armRight = armLeft.clone();
  armRight.position.z = -0.74;

  // Crossmember Torque Tube
  const torqueTube = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.48, 10), darkChassis);
  torqueTube.position.set(1.9, 1.15, 0);
  torqueTube.rotation.x = Math.PI / 2;

  // Hydraulic Lift Rams
  const cylGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.95, 10);
  const rodGeom = new THREE.CylinderGeometry(0.028, 0.028, 0.9, 10);
  [-0.66, 0.66].forEach((zSide) => {
    const barrel = new THREE.Mesh(cylGeom, darkChassis);
    barrel.position.set(1.4, 1.25, zSide);
    barrel.rotation.z = 1.08;
    const rod = new THREE.Mesh(rodGeom, chromeRam);
    rod.position.set(1.76, 1.02, zSide);
    rod.rotation.z = 1.08;
    loaderGroup.add(barrel, rod);
  });

  // 4-in-1 Front Loader Bucket
  const bucketGeom = new THREE.BoxGeometry(0.72, 0.72, 1.95);
  const bucket = new THREE.Mesh(bucketGeom, jcbYellow);
  bucket.position.set(2.88, 0.58, 0);
  bucket.rotation.z = 0.14;
  bucket.castShadow = true;

  // 6 Cast Digging Teeth
  for (let z = -0.82; z <= 0.85; z += 0.33) {
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 4), castSteel);
    tooth.position.set(3.26, 0.28, z);
    tooth.rotation.z = -Math.PI / 2 + 0.14;
    loaderGroup.add(tooth);
  }

  loaderGroup.add(armLeft, armRight, torqueTube, bucket);
  jcb.add(loaderGroup);

  // 5. Rear Excavator Backhoe Arm (Roading Configuration)
  const backhoeGroup = new THREE.Group();
  backhoeGroup.position.set(-1.75, 1.1, 0);

  // Kingpost Swivel Base
  const kingpost = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.68, 0.52), darkChassis);
  backhoeGroup.add(kingpost);

  // Arched Main Boom
  const boom = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.24, 0.2), jcbYellow);
  boom.position.set(-0.65, 0.68, 0);
  boom.rotation.z = 0.82;

  // Dipper Arm (Stick folded downward)
  const dipper = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.18, 0.16), jcbYellow);
  dipper.position.set(-1.22, 0.88, 0);
  dipper.rotation.z = -1.22;

  // Excavator Digging Bucket
  const backhoeBucket = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.42), darkChassis);
  backhoeBucket.position.set(-1.38, 0.35, 0);
  backhoeBucket.rotation.z = 0.38;

  // 4 Backhoe Digging Teeth
  for (let bz = -0.15; bz <= 0.16; bz += 0.1) {
    const bTooth = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.14, 4), castSteel);
    bTooth.position.set(-1.58, 0.16, bz);
    bTooth.rotation.z = Math.PI / 2 + 0.38;
    backhoeGroup.add(bTooth);
  }

  // Backhoe Hydraulic Cylinders
  const bhCyl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8), darkChassis);
  bhCyl.position.set(-0.45, 0.95, 0);
  bhCyl.rotation.z = 0.82;
  const bhRod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.7, 8), chromeRam);
  bhRod.position.set(-0.75, 1.25, 0);
  bhRod.rotation.z = 0.82;

  backhoeGroup.add(boom, dipper, backhoeBucket, bhCyl, bhRod);
  jcb.add(backhoeGroup);

  // 6. High-Detail Wheels with Realistic Chevron Lugs
  const wheels: { group: THREE.Group; radius: number }[] = [];

  // Front Wheel: Smaller steering wheel with industrial tread
  const makeFrontWheel = (z: number) => {
    const wg = new THREE.Group();
    wg.position.set(1.15, 0.44, z);

    // Tire Base Cylinder
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.34, 24), tireRubber);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;

    // Yellow Steel Dish Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.35, 18), jcbYellow);
    rim.rotation.x = Math.PI / 2;

    // Dark Hub & 6 Lug Nuts
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.37, 10), darkChassis);
    hub.rotation.x = Math.PI / 2;

    wg.add(tire, rim, hub);
    jcb.add(wg);
    wheels.push({ group: wg, radius: 0.44 });
  };

  // Rear Drive Wheel: Giant tractor wheel with 16 pairs of authentic angled chevron lugs!
  const makeRearWheel = (z: number) => {
    const wg = new THREE.Group();
    wg.position.set(-0.95, 0.76, z);

    // Main Tire Body
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.54, 32), tireRubber);
    tire.rotation.x = Math.PI / 2;
    tire.castShadow = true;

    // Deep-Dish Yellow Rim
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.55, 24), jcbYellow);
    rim.rotation.x = Math.PI / 2;

    // Heavy Planetary Final Drive Hub
    const planetary = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.59, 12), darkChassis);
    planetary.rotation.x = Math.PI / 2;

    wg.add(tire, rim, planetary);

    // 16 Pairs of Chevron Tread Lugs
    const lugGeom = new THREE.BoxGeometry(0.16, 0.055, 0.22);
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const lx = Math.cos(angle) * 0.76;
      const ly = Math.sin(angle) * 0.76;

      // Left branch of V-chevron
      const lugL = new THREE.Mesh(lugGeom, tireRubber);
      lugL.position.set(lx, ly, -0.11);
      lugL.rotation.z = angle;
      lugL.rotation.y = 0.35;

      // Right branch of V-chevron
      const lugR = new THREE.Mesh(lugGeom, tireRubber);
      lugR.position.set(lx, ly, 0.11);
      lugR.rotation.z = angle;
      lugR.rotation.y = -0.35;

      wg.add(lugL, lugR);
    }

    jcb.add(wg);
    wheels.push({ group: wg, radius: 0.76 });
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
    scene.background = new THREE.Color("#F6F3EE"); // Warm off-white
    scene.fog = new THREE.FogExp2(0xF6F3EE, 0.012);

    // 2. Camera Setup: Slightly elevated 3/4 architectural viewpoint
    // Calibrated so the entire message "WELCOME TO ANUMAAN" and the JCB are framed without cropping
    const isMobile = width < 768;
    const camera = new THREE.PerspectiveCamera(isMobile ? 46 : 38, width / height, 0.1, 120);
    camera.position.set(0, isMobile ? 4.2 : 3.8, isMobile ? 14.5 : 12.2);
    camera.lookAt(0.6, 0.85, 0);

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

    // 4. Lighting: Soft ambient sky and warm directional sunlight
    const ambientLight = new THREE.AmbientLight(0xFFFBF2, 0.9);
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
    // Tracking the rear print threshold of the JCB!
    const clippingPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), -25);

    // 7. Freestanding Upright 3D Letters: "WELCOME TO ANUMAAN"
    // Bottom touches ground at Y = 0; front faces the camera (+Z)
    const textGroup = new THREE.Group();
    scene.add(textGroup);

    // Dual-face PBR materials: dark architectural charcoal front face + slightly lighter stone sides
    const letterFrontMat = new THREE.MeshStandardMaterial({
      color: 0x1A222E, // Deep charcoal concrete
      roughness: 0.65,
      metalness: 0.18,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });
    const letterSideMat = new THREE.MeshStandardMaterial({
      color: 0x2A3545, // Lighter stone side facets
      roughness: 0.55,
      metalness: 0.22,
      clippingPlanes: [clippingPlane],
      clipShadows: true,
    });
    const letterMaterials = [letterFrontMat, letterSideMat];

    const words = [
      { text: "WELCOME", startX: -7.6 },
      { text: "TO", startX: -1.3 },
      { text: "ANUMAAN", startX: 1.1 },
    ];

    const letterHeight = 1.15;
    const letterWidth = 0.68;
    const letterDepth = 0.32; // Genuine 3D depth
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
        // STANDING VERTICALLY UPRIGHT:
        // y extends from 0 to letterHeight;
        // z extends from -letterDepth/2 to +letterDepth/2;
        // slight -0.06 rad tilt so the front face catches the golden sunlight!
        mesh.rotation.x = -0.05;
        mesh.position.set(curX, 0, -0.4);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        textGroup.add(mesh);

        curX += letterWidth + letterSpacing;
      }
    });

    // 8. Realistic 3D Yellow JCB Backhoe Loader
    const { jcb, wheels, beacon } = createRealisticJCB();
    // Position JCB slightly in front of text (Z = 0.8) so it drives alongside without awkward clipping
    jcb.position.z = 0.75;
    scene.add(jcb);

    // 9. Subtle Ground Dust Particles (emitted behind wheels & as letters emerge)
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

    // 10. Animation Timing & Path
    let startTime = performance.now();
    let isRunning = true;
    let animId: number;

    const startX = -13.5; // Starts off-screen left
    const stopX = 9.8;    // Stops smoothly on the right with full message visible
    const travelDistance = stopX - startX;
    const travelDuration = 5600; // 5.6 seconds smooth cinematic drive
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
        // Idling engine gentle vibration
        jcb.position.y = Math.sin(elapsed * 0.02) * 0.006;
        jcb.rotation.z = 0;
      }

      // Rotate 4 wheels in sync with linear displacement: dAngle = -dx / radius
      wheels.forEach(({ group, radius }) => {
        group.rotation.z -= deltaX / radius;
      });

      // Amber beacon rotation
      beacon.rotation.y = elapsed * 0.012;

      // Live Position-Synchronized Text Reveal:
      // The rear edge of the JCB backhoe is at currentJcbX - 2.5.
      // Upright letters emerge progressively behind the vehicle!
      const printThreshold = currentJcbX - 2.5;
      clippingPlane.constant = printThreshold;

      // Dust particle simulation (only active while vehicle moves)
      if (tNorm < 0.98 && Math.abs(deltaX) > 0.001) {
        const positions = particleGeom.attributes.position.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          if (particleVelocities[i].life <= 0 && Math.random() < 0.28) {
            // Spawn particle behind rear wheels
            positions[i * 3] = currentJcbX - 1.6 + (Math.random() - 0.5) * 0.8;
            positions[i * 3 + 1] = 0.05 + Math.random() * 0.12;
            positions[i * 3 + 2] = 0.75 + (Math.random() - 0.5) * 1.8;

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
              positions[i * 3 + 1] = -10; // Hide
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
      camera.fov = mobile ? 46 : 38;
      camera.position.set(0, mobile ? 4.2 : 3.8, mobile ? 14.5 : 12.2);
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

      {/* Note: The bottom "Printing Construction Blueprint..." banner has been completely removed as requested */}

      {/* Final Cinematic Brand Card (Fades in after JCB stops and entire message is standing) */}
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
