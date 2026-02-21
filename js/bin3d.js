/* ===== bin3d.js — 3D Smart Bin Canvas ===== */
(function () {
  const canvas = document.getElementById('binCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let rotY = -0.4, rotX = 0.15;
  let isDragging = false, lastX = 0, lastY = 0;
  let zoom = 1;

  /* ── Input ── */
  canvas.addEventListener('mousedown', e => { isDragging = true; lastX = e.clientX; lastY = e.clientY; });
  window.addEventListener('mouseup',   () => { isDragging = false; });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    rotY += (e.clientX - lastX) * 0.01;
    rotX  = Math.max(-0.4, Math.min(0.5, rotX + (e.clientY - lastY) * 0.005));
    lastX = e.clientX; lastY = e.clientY;
  });
  canvas.addEventListener('wheel', e => {
    zoom = Math.max(0.7, Math.min(1.5, zoom - e.deltaY * 0.001));
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchstart', e => { isDragging = true; lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; });
  window.addEventListener('touchend',   () => { isDragging = false; });
  window.addEventListener('touchmove',  e => {
    if (!isDragging) return;
    rotY += (e.touches[0].clientX - lastX) * 0.01;
    rotX  = Math.max(-0.4, Math.min(0.5, rotX + (e.touches[0].clientY - lastY) * 0.005));
    lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
  });

  /* ── Math ── */
  function project(x, y, z, cx, cy, fov = 380) {
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const rx =  x * cosY - z * sinY;
    const ry =  y;
    const rz =  x * sinY + z * cosY;
    const ry2 = ry * cosX - rz * sinX;
    const rz2 = ry * sinX + rz * cosX;
    const d = fov / (fov + rz2 + 300);
    return { sx: cx + rx * d * zoom, sy: cy + ry2 * d * zoom, z: rz2 };
  }

  function drawFace(pts, color, alpha = 1) {
    if (!pts.length) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].sx, pts[0].sy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
    ctx.closePath();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,255,136,0.13)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  function box(cx, cy, x, y, z, w, h, d, colors) {
    const p = (px,py,pz) => project(px, py, pz, cx, cy);
    const v = [
      p(x,   y,   z),   p(x+w, y,   z),   p(x+w, y+h, z),   p(x,   y+h, z),
      p(x,   y,   z+d), p(x+w, y,   z+d), p(x+w, y+h, z+d), p(x,   y+h, z+d),
    ];
    const faces = [
      [v[4],v[5],v[6],v[7], colors[0]],
      [v[0],v[1],v[2],v[3], colors[1]],
      [v[0],v[4],v[7],v[3], colors[2]],
      [v[1],v[5],v[6],v[2], colors[2]],
      [v[0],v[1],v[5],v[4], colors[3]],
      [v[3],v[2],v[6],v[7], colors[4]],
    ];
    faces.sort((a, b) => {
      const za = a.slice(0,4).reduce((s,p) => s+p.z, 0) / 4;
      const zb = b.slice(0,4).reduce((s,p) => s+p.z, 0) / 4;
      return zb - za;
    });
    faces.forEach(f => drawFace(f.slice(0,4), f[4]));
  }

  const COLORS = {
    organic: { front:'#226628', body:'#1a4d1e', lid:'#2d7a33' },
    recycle: { front:'#1a3d7a', body:'#0d2b4d', lid:'#1565c0' },
    general: { front:'#6b4500', body:'#4d3300', lid:'#8a5f00' },
  };

  function lighten(col) {
    const n = parseInt(col.slice(1), 16);
    const r = Math.min(255, ((n>>16)&255) + 40);
    const g = Math.min(255, ((n>>8) &255) + 40);
    const b = Math.min(255, ( n     &255) + 40);
    return `rgb(${r},${g},${b})`;
  }

  function drawBin(cx, cy, type, bx, emoji, label) {
    const c = COLORS[type];
    const bw = 90, bh = 140, bd = 60, baseY = 50;

    // body
    box(cx, cy, bx, baseY, -bd/2, bw, bh, bd, [c.front, c.body, c.body, c.body, '#111']);
    // lid
    box(cx, cy, bx-4, baseY-22, -bd/2-4, bw+8, 20, bd+8, [c.lid, c.lid, lighten(c.lid), lighten(c.lid), '#0a0f0d']);

    // label
    const mid = project(bx + bw/2, baseY + bh/2, bd/2, cx, cy);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `bold ${15*zoom}px Kanit`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(emoji, mid.sx, mid.sy - 10*zoom);
    ctx.font = `${9*zoom}px Kanit`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(label, mid.sx, mid.sy + 10*zoom);
    ctx.restore();
  }

  function drawScreen(cx, cy) {
    const t = Date.now() / 1000;
    box(cx, cy, -40, -95, -18, 80, 52, 10, ['#0a1f0d','#061209','#051008','#0a1f0d','#030908']);

    const sp = project(0, -69, -7, cx, cy);
    // glow
    const g = ctx.createRadialGradient(sp.sx, sp.sy, 0, sp.sx, sp.sy, 38*zoom);
    g.addColorStop(0, 'rgba(0,255,136,0.28)');
    g.addColorStop(1, 'transparent');
    ctx.fillStyle = g;
    ctx.fillRect(sp.sx - 42*zoom, sp.sy - 32*zoom, 84*zoom, 64*zoom);

    // QR pattern
    const qpat = [
      [1,1,1,0,1,1,1],[1,0,1,0,1,0,1],[1,1,1,1,0,0,0],
      [0,1,0,0,1,1,0],[0,0,1,1,0,1,0],[1,0,1,0,1,0,1],[1,1,0,0,1,1,1]
    ];
    const cs = 3.8 * zoom;
    const qx = sp.sx - 14*zoom, qy = sp.sy - 14*zoom;
    ctx.globalAlpha = 0.75 + 0.25 * Math.sin(t * 3);
    ctx.fillStyle = '#00ff88';
    qpat.forEach((row, ry) => row.forEach((c, rx) => {
      if (c) ctx.fillRect(qx + rx*cs, qy + ry*cs, cs-0.5, cs-0.5);
    }));
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.font = `${6.5*zoom}px Space Mono`;
    ctx.fillStyle = 'rgba(0,255,136,0.65)';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN ME', sp.sx, sp.sy + 19*zoom);
    ctx.restore();
  }

  function drawBase(cx, cy) {
    box(cx, cy, -175, 192, -58, 350, 16, 116, ['#1a2b1d','#0d1a0f','#111a14','#222','#0a0f0d']);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2, cy = canvas.height / 2;

    // ground glow
    const gg = ctx.createRadialGradient(cx, cy+110, 0, cx, cy+110, 200);
    gg.addColorStop(0, 'rgba(0,255,136,0.035)');
    gg.addColorStop(1, 'transparent');
    ctx.fillStyle = gg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawBase(cx, cy + 60);
    drawBin(cx, cy + 60, 'organic', -165, '🍃', 'อินทรีย์');
    drawBin(cx, cy + 60, 'recycle',  -35, '♻️', 'รีไซเคิล');
    drawBin(cx, cy + 60, 'general',  95,  '🗑️', 'ทั่วไป');

    // pole
    box(cx, cy+60, -7, -125, -5, 14, 330, 10, ['#1a2b1d','#0d1a0f','#111','#1e3020','#0a0f0d']);
    drawScreen(cx, cy + 60);

    rotY += 0.004;
    requestAnimationFrame(render);
  }

  render();
})();
