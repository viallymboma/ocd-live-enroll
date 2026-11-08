"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

import { ScrollTrigger } from "@/components/fx/gsap";
import { DOTS } from "./globe-dots";

/**
 * THE 3D HERO — a dotted Earth (Natural Earth land, ~4 600 dots) turned to face Africa,
 * Togo lit in OCD orange, a light beam on Lomé and live "signals" flying from Lomé to
 * the continent's capitals. Colours come from the theme tokens and follow the switch.
 *
 * Motion: an intro spin onto Africa, a slow idle sway, the mouse tilts it (fine pointers),
 * scrolling the hero turns it further. Renders only while visible; one still frame on
 * reduced motion. Calls `onFail` when WebGL is unavailable (the 2D map is shown instead).
 */
const R = 1;
const LOME = { lat: 6.1375, lon: 1.2123 };
const CITIES: [number, number][] = [
  [14.69, -17.45], // Dakar
  [5.36, -4.01], // Abidjan
  [4.05, 9.7], // Douala
  [-4.44, 15.27], // Kinshasa
  [-1.29, 36.82], // Nairobi
  [-26.2, 28.05], // Johannesburg
  [30.04, 31.24], // Cairo
  [33.57, -7.59], // Casablanca
  [8.98, 38.76], // Addis Ababa
];
const FACE = { lat: 4, lon: 14 }; // the point turned towards the viewer: Africa, nudged west to Lomé

function toVec(lat: number, lon: number, r = R) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
}

function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const c = (name: string) => new THREE.Color(cs.getPropertyValue(name).trim() || "#888");
  const dark = document.documentElement.dataset.theme === "dark";
  return { dark, sphere: c("--ink-3"), world: c("--line-2"), africa: c("--gold"), togo: c("--ember-2"), ember: c("--ember"), glow: c("--ember-2") };
}

export default function Globe({ className = "", onFail }: { className?: string; onFail?: () => void }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      // No GPU (software rendering) → refuse, and the light 2D map is shown instead: a slow globe is worse than none.
      // `?globe=force` overrides it, for testing in headless browsers.
      const force = new URLSearchParams(window.location.search).has("globe");
      // Ask the browser quietly first: three.js would log a red console error when it refuses.
      const probe = document.createElement("canvas");
      const ok = probe.getContext("webgl2", { failIfMajorPerformanceCaveat: !force }) ?? probe.getContext("webgl", { failIfMajorPerformanceCaveat: !force });
      (ok as WebGLRenderingContext | null)?.getExtension("WEBGL_lose_context")?.loseContext();
      if (!ok) throw new Error("no-gpu");
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: !force });
    } catch {
      onFail?.();
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(pointer: fine)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 4.4);

    const earth = new THREE.Group();
    scene.add(earth);
    let theme = readTheme();

    // --- the body of the planet (hides the dots on the far side)
    // Lit from the top-left, darker towards the edge: reads as a ball, not a disc.
    const sphereMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: theme.sphere }, uDark: { value: theme.dark ? 1 : 0 } },
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uDark; varying vec3 vN;
        void main(){ float facing = clamp(dot(vN, vec3(0.,0.,1.)), 0., 1.); float light = clamp(dot(vN, normalize(vec3(-0.5,0.6,0.7))), 0., 1.);
        vec3 c = uColor * mix(0.78, 1.0, pow(facing, 0.6)) + vec3(0.06) * pow(light, 3.) * (1. - uDark * 0.5);
        gl_FragColor = vec4(c, 1.);
        #include <colorspace_fragment>
        }`,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(R * 0.995, 64, 64), sphereMat);
    earth.add(sphere);

    // --- atmosphere: a soft orange rim
    const atmoMat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: theme.glow }, uStrength: { value: theme.dark ? 1.0 : 0.7 } },
      vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      // Back faces: strongest right at the planet's edge, fading to nothing at the outer rim.
      fragmentShader: `uniform vec3 uColor; uniform float uStrength; varying vec3 vN; void main(){ float i = pow(clamp(-dot(vN, vec3(0.,0.,1.)), 0.0, 1.0), 1.6) * 0.55 * uStrength; gl_FragColor = vec4(uColor, i);
        #include <colorspace_fragment>
        }`,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.18, 64, 64), atmoMat));

    // --- land dots
    const n = DOTS.length / 3;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const size = new Float32Array(n);
    const kinds = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const v = toVec(DOTS[i * 3], DOTS[i * 3 + 1], R * 1.003);
      pos.set([v.x, v.y, v.z], i * 3);
      kinds[i] = DOTS[i * 3 + 2];
      size[i] = kinds[i] === 2 ? 9 : kinds[i] === 1 ? 6.2 : 4.6;
    }
    const paintDots = () => {
      for (let i = 0; i < n; i++) {
        const c = kinds[i] === 2 ? theme.togo : kinds[i] === 1 ? theme.africa : theme.world;
        col.set([c.r, c.g, c.b], i * 3);
      }
      dotGeo.attributes.color.needsUpdate = true;
    };
    const dotGeo = new THREE.BufferGeometry();
    dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    dotGeo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    dotGeo.setAttribute("size", new THREE.BufferAttribute(size, 1));
    const dotMat = new THREE.ShaderMaterial({
      uniforms: { uPx: { value: renderer.getPixelRatio() }, uScale: { value: 1 } },
      vertexShader: `attribute float size; attribute vec3 color; varying vec3 vC; varying float vF; uniform float uPx; uniform float uScale;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.); vF = dot(normalize(normalMatrix * position), vec3(0.,0.,1.));
        gl_PointSize = size * uPx * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vF; void main(){ vec2 c = gl_PointCoord - .5; if (length(c) > .5) discard; gl_FragColor = vec4(vC, smoothstep(-0.05, 0.35, vF));
        #include <colorspace_fragment>
        }`,
      transparent: true,
      depthWrite: false,
    });
    paintDots();
    earth.add(new THREE.Points(dotGeo, dotMat));

    // --- Lomé: beam + pulsing ring
    const lome = toVec(LOME.lat, LOME.lon);
    const normal = lome.clone().normalize();
    const beamMat = new THREE.MeshBasicMaterial({ color: theme.ember, transparent: true, opacity: 0.85, depthWrite: false });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.0015, 0.42, 12, 1, true), beamMat);
    beam.position.copy(normal.clone().multiplyScalar(R + 0.21));
    beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    earth.add(beam);
    const ringMat = new THREE.MeshBasicMaterial({ color: theme.ember, transparent: true, side: THREE.DoubleSide, depthWrite: false });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.04, 48), ringMat);
    ring.position.copy(normal.clone().multiplyScalar(R * 1.006));
    ring.lookAt(normal.clone().multiplyScalar(3));
    earth.add(ring);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xfff3e2 });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.014, 16, 16), coreMat);
    core.position.copy(normal.clone().multiplyScalar(R * 1.006));
    earth.add(core);

    // --- routes from Lomé + travelling signals
    const arcMat = new THREE.LineBasicMaterial({ color: theme.ember, transparent: true, opacity: 0.85, depthWrite: false });
    const sigMat = new THREE.MeshBasicMaterial({ color: 0xfff3e2 });
    const routes = CITIES.map(([lat, lon], i) => {
      const a = toVec(LOME.lat, LOME.lon, R * 1.004);
      const b = toVec(lat, lon, R * 1.004);
      const mid = a.clone().add(b).normalize().multiplyScalar(R * (1 + a.distanceTo(b) * 0.38));
      const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      const geo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(64));
      geo.setDrawRange(0, 0);
      const line = new THREE.Line(geo, arcMat);
      earth.add(line);
      const end = new THREE.Mesh(new THREE.SphereGeometry(0.011, 10, 10), arcMat);
      end.position.copy(b);
      end.scale.setScalar(0);
      earth.add(end);
      const sig = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 10), sigMat);
      sig.visible = false;
      earth.add(sig);
      return { curve, geo, end, sig, delay: 0.9 + i * 0.14, speed: 0.28 + (i % 4) * 0.06, phase: i * 0.37 };
    });

    // --- orientation: Africa faces the viewer
    const face = toVec(FACE.lat, FACE.lon);
    const baseY = -Math.atan2(face.x, face.z);
    const baseX = (FACE.lat * Math.PI) / 180 * 0.9;
    earth.rotation.order = "YXZ";

    // --- inputs
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (fine && !reduce) window.addEventListener("pointermove", onMove, { passive: true });
    let scroll = 0;
    const section = el.closest("section") ?? el;
    const st = reduce ? null : ScrollTrigger.create({ trigger: section, start: "top top", end: "bottom top", onUpdate: (s) => (scroll = s.progress) });

    const resize = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      // Dot size follows the canvas: ≈3 px (world), 4 px (Africa), 6 px (Togo) on a 600 px globe.
      dotMat.uniforms.uScale.value = (Math.min(w, h) / 900) * camera.position.z;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Theme switch → recolour, no reload.
    const mo = new MutationObserver(() => {
      theme = readTheme();
      sphereMat.uniforms.uColor.value = theme.sphere;
      sphereMat.uniforms.uDark.value = theme.dark ? 1 : 0;
      atmoMat.uniforms.uColor.value = theme.glow;
      atmoMat.uniforms.uStrength.value = theme.dark ? 1.0 : 0.7;
      beamMat.color.copy(theme.ember);
      ringMat.color.copy(theme.ember);
      arcMat.color.copy(theme.ember);
      paintDots();
      if (reduce) frame(1e9);
    });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

    // --- the loop
    const t0 = performance.now();
    const ease = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 4);
    function frame(now: number) {
      const t = reduce ? 100 : (now - t0) / 1000;
      const intro = ease(t / 2.4);
      pointer.x += (pointer.tx - pointer.x) * 0.05;
      pointer.y += (pointer.ty - pointer.y) * 0.05;
      const sway = reduce ? 0 : Math.sin(t * 0.22) * 0.16;
      earth.rotation.y = baseY - (1 - intro) * 2.2 + sway + pointer.x * 0.35 + scroll * 1.1;
      earth.rotation.x = baseX + pointer.y * 0.18 - scroll * 0.25;
      earth.scale.setScalar(0.82 + intro * 0.18);
      const pulse = (t * 0.8) % 1;
      ring.scale.setScalar(1 + pulse * 2.6);
      ringMat.opacity = 0.9 * (1 - pulse);
      beamMat.opacity = 0.6 + Math.sin(t * 3) * 0.2;
      for (const r of routes) {
        const k = ease((t - r.delay) / 1.3);
        r.geo.setDrawRange(0, Math.floor(k * 65));
        r.end.scale.setScalar(ease((t - r.delay - 1.1) / 0.5));
        if (!reduce && t > r.delay + 1.6) {
          const u = (t * r.speed + r.phase) % 1;
          r.sig.visible = true;
          r.sig.position.copy(r.curve.getPoint(u));
        }
      }
      renderer.render(scene, camera);
    }

    let raf = 0;
    let visible = true;
    const loop = (now: number) => {
      frame(now);
      raf = requestAnimationFrame(loop);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible && !reduce && !document.hidden) raf = requestAnimationFrame(loop);
    });
    const onVis = () => {
      cancelAnimationFrame(raf);
      if (visible && !reduce && !document.hidden) raf = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVis);
    if (reduce) frame(1e9);
    else io.observe(el);

    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      st?.kill();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pointermove", onMove);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [onFail]);

  return <div ref={box} className={className} />;
}
