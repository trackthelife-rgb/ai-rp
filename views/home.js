// ═══════════════════════════════════════════
// views/home.js (no modules)
// ═══════════════════════════════════════════

window.HomeView = {
  render() {
    this.createParticles();
  },
  createParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#c084fc', '#f472b6', '#818cf8', '#38bdf8'];
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 5 + 2;
      p.style.cssText = `
        width:${size}px;height:${size}px;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation-duration:${Math.random() * 8 + 6}s;
        animation-delay:${Math.random() * 5}s;
      `;
      container.appendChild(p);
    }
  }
};
