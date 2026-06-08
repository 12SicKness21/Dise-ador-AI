"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Archivo:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

  :root{
    --amarillo:#F2E600;--amarillo-soft:#FBF3A0;--marron:#5C3A0E;--marron-ink:#3A2607;
    --obsidiana:#2D2B2D;--porcelana:#F5F2EC;--piedra:#C8BAA8;--avellana:#B39C80;
    --spearmint:#3EBF85;--spearmint-deep:#2E9E6C;--coral:#F5856A;--glaciar:#A8C4D4;
    --white:#FFFEFB;
    --shadow:0 18px 50px -22px rgba(58,38,7,.45);
    --shadow-sm:0 8px 26px -14px rgba(58,38,7,.4);
    --r:22px;--maxw:1180px;
    --disp:'Bricolage Grotesque',sans-serif;
    --body:'Archivo',sans-serif;
    --mono:'Space Mono',monospace;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  html{scroll-behavior:smooth}
  body{font-family:var(--body);background:var(--porcelana);color:var(--marron-ink);-webkit-font-smoothing:antialiased;overflow-x:hidden}
  a{color:inherit;text-decoration:none}
  img{display:block;max-width:100%}
  .wrap{max-width:var(--maxw);margin:0 auto;padding:0 28px}
  h1,h2,h3{font-family:var(--disp);line-height:1.02;letter-spacing:-.02em;color:var(--marron-ink)}
  .eyebrow{display:inline-flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:var(--marron)}
  .eyebrow::before{content:"";width:26px;height:2px;background:var(--marron)}

  .btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font-family:var(--body);font-weight:700;font-size:15px;padding:0 26px;height:54px;border-radius:999px;cursor:pointer;border:none;transition:transform .18s ease,box-shadow .18s ease,background .18s ease;white-space:nowrap}
  .btn:active{transform:translateY(1px) scale(.99)}
  .btn-yellow{background:var(--amarillo);color:var(--marron-ink);box-shadow:0 10px 26px -12px rgba(242,230,0,.9)}
  .btn-yellow:hover{transform:translateY(-2px);box-shadow:0 16px 34px -12px rgba(242,230,0,1)}
  .btn-dark{background:var(--obsidiana);color:var(--white)}
  .btn-dark:hover{transform:translateY(-2px);box-shadow:var(--shadow-sm)}
  .btn-wa{background:var(--spearmint);color:#06301f}
  .btn-wa:hover{background:var(--spearmint-deep);color:#fff;transform:translateY(-2px)}
  .btn-login{background:#2E6F8F;color:#fff}
  .btn-login:hover{background:#245A75;transform:translateY(-2px);box-shadow:0 14px 30px -14px rgba(46,111,143,.7)}
  .btn-ghost{background:transparent;color:var(--marron-ink);border:1.5px solid rgba(58,38,7,.22)}
  .btn-ghost:hover{border-color:var(--marron-ink);background:rgba(58,38,7,.04)}
  .btn-sm{height:46px;padding:0 20px;font-size:14px}

  header{position:sticky;top:0;z-index:60;background:rgba(245,242,236,.82);backdrop-filter:blur(14px);border-bottom:1px solid rgba(58,38,7,.08)}
  .nav{display:flex;align-items:center;justify-content:space-between;height:74px}
  .brand{display:flex;align-items:center;gap:11px}
  .brand img{width:40px;height:40px;border-radius:50%}
  .brand .bt{display:flex;flex-direction:column;line-height:1}
  .brand .bt b{font-family:var(--disp);font-weight:800;font-size:18px;letter-spacing:-.01em;color:var(--marron-ink)}
  .brand .bt span{font-family:var(--mono);font-size:9.5px;letter-spacing:.32em;color:var(--marron);text-transform:uppercase;margin-top:2px}
  .nav-links{display:flex;align-items:center;gap:30px}
  .nav-links a{font-size:14.5px;font-weight:500;opacity:.82;transition:opacity .15s}
  .nav-links a:hover{opacity:1}
  .nav-cta{display:flex;align-items:center;gap:12px}
  .burger{display:none;background:none;border:none;cursor:pointer;flex-direction:column;gap:5px;padding:8px}
  .burger span{width:24px;height:2.5px;background:var(--marron-ink);border-radius:2px;transition:.2s}

  .hero{position:relative;padding:62px 0 78px;overflow:hidden}
  .blob{position:absolute;border-radius:50%;background:var(--amarillo);filter:blur(2px);z-index:0}
  .blob.b1{width:520px;height:520px;top:-220px;right:-160px;opacity:.55}
  .blob.b2{width:260px;height:260px;bottom:-120px;left:-110px;background:var(--amarillo-soft);opacity:.6}
  .hero-grid{position:relative;z-index:2;display:grid;grid-template-columns:1.02fr 1fr;gap:54px;align-items:center}
  .hero h1{font-size:clamp(36px,4.6vw,58px);font-weight:800;line-height:1.06}
  .hero h1 .hl{position:relative;z-index:1}
  .hero h1 .hl::after{content:"";position:absolute;left:-4px;right:-4px;bottom:6px;height:.36em;background:var(--amarillo);z-index:-1;border-radius:3px;transform:rotate(-1.4deg)}
  .hero p.lede{font-size:19px;line-height:1.55;color:#5b4a32;margin:38px 0 32px;max-width:520px}
  .hero-cta{display:flex;flex-wrap:wrap;gap:14px;align-items:center}
  .hero-meta{display:flex;align-items:center;gap:18px;margin-top:30px;flex-wrap:wrap}
  .hero-meta .chip{display:flex;align-items:center;gap:9px;font-size:13.5px;color:#5b4a32;font-weight:500}
  .dotg{width:9px;height:9px;border-radius:50%;background:var(--spearmint);box-shadow:0 0 0 4px rgba(62,191,133,.18)}

  .ba{position:relative;width:100%;aspect-ratio:1/1;border-radius:var(--r);overflow:hidden;box-shadow:var(--shadow);user-select:none;touch-action:none;cursor:ew-resize;border:6px solid var(--white)}
  .ba img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
  .ba .after{z-index:1}
  .ba .before{z-index:2;clip-path:inset(0 50% 0 0)}
  .ba .lab{position:absolute;top:14px;z-index:4;padding:6px 12px;border-radius:999px;font-family:var(--mono);font-size:11px;letter-spacing:.12em;font-weight:700;text-transform:uppercase}
  .ba .lab-b{left:14px;background:rgba(45,43,45,.82);color:#fff}
  .ba .lab-a{right:14px;background:var(--amarillo);color:var(--marron-ink)}
  .ba .handle{position:absolute;top:0;bottom:0;left:50%;width:3px;background:#fff;z-index:5;transform:translateX(-50%);box-shadow:0 0 14px rgba(0,0,0,.45)}
  .ba .knob{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:6;width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 18px rgba(0,0,0,.3)}
  .ba .knob svg{width:22px;height:22px;color:var(--marron-ink)}
  .ba .tag{position:absolute;left:14px;bottom:14px;z-index:4;background:rgba(255,254,251,.92);backdrop-filter:blur(6px);padding:9px 14px;border-radius:14px;display:flex;align-items:center;gap:9px;box-shadow:var(--shadow-sm)}
  .ba .tag img{position:static;width:24px;height:24px;border-radius:50%}
  .ba .tag span{font-size:12.5px;font-weight:600;color:var(--marron-ink)}

  .marquee{background:var(--obsidiana);overflow:hidden;padding:18px 0}
  .mq-track{display:flex;gap:48px;white-space:nowrap;width:max-content;animation:mq 26s linear infinite}
  .mq-track span{font-family:var(--disp);font-weight:700;font-size:21px;color:var(--amarillo);display:flex;align-items:center;gap:48px}
  .mq-track span::after{content:"✦";color:rgba(242,230,0,.4);font-size:15px}
  @keyframes mq{to{transform:translateX(-50%)}}

  section.sec{padding:96px 0}
  .sec-head{max-width:680px;margin-bottom:54px}
  .sec-head h2{font-size:clamp(30px,3.8vw,46px);font-weight:800;margin-top:16px}
  .sec-head p{font-size:17.5px;line-height:1.55;color:#5b4a32;margin-top:16px}

  .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  .step{background:var(--white);border-radius:var(--r);padding:34px 30px;border:1px solid rgba(58,38,7,.07);box-shadow:var(--shadow-sm);position:relative;overflow:hidden}
  .step .num{font-family:var(--disp);font-weight:800;font-size:64px;color:var(--amarillo);line-height:.8;-webkit-text-stroke:1.5px rgba(92,58,14,.28)}
  .step h3{font-size:23px;font-weight:700;margin:18px 0 10px}
  .step p{font-size:15.5px;line-height:1.55;color:#5b4a32}
  .step .ic{position:absolute;top:30px;right:30px;width:42px;height:42px;border-radius:12px;background:var(--porcelana);display:flex;align-items:center;justify-content:center}
  .step .ic svg{width:22px;height:22px;color:var(--marron)}

  .dark{background:var(--obsidiana);color:var(--white)}
  .dark h2,.dark h3{color:var(--white)}
  .dark .eyebrow{color:var(--amarillo)}
  .dark .eyebrow::before{background:var(--amarillo)}
  .dark .sec-head p{color:#cbbfae}
  .styles-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:16px}
  .style-card{border-radius:18px;overflow:hidden;position:relative;aspect-ratio:3/4;background:#3a383a;border:1px solid rgba(255,255,255,.08);transition:transform .25s ease}
  .style-card:hover{transform:translateY(-6px)}
  .style-card img{width:100%;height:100%;object-fit:cover}
  .style-card .cap{position:absolute;left:0;right:0;bottom:0;padding:14px 14px 13px;background:linear-gradient(to top,rgba(20,18,20,.92),transparent);font-family:var(--mono);font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:700;color:#fff}
  .style-card .cap b{color:var(--amarillo)}

  .results-grid{display:grid;grid-template-columns:1.4fr 1fr;grid-template-rows:auto auto;gap:18px}
  .rcard{border-radius:var(--r);overflow:hidden;position:relative;box-shadow:var(--shadow-sm);background:var(--white)}
  .rcard img{width:100%;height:100%;object-fit:cover}
  .rcard.big{grid-row:span 2}
  .rcard .rt{position:absolute;left:16px;top:16px;background:rgba(255,254,251,.92);backdrop-filter:blur(6px);padding:7px 13px;border-radius:999px;font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:var(--marron-ink)}

  .feat{display:grid;grid-template-columns:repeat(3,1fr);gap:30px;margin-top:18px}
  .feat .f{display:flex;flex-direction:column;gap:10px}
  .feat .f .fi{width:46px;height:46px;border-radius:13px;background:var(--amarillo);display:flex;align-items:center;justify-content:center}
  .feat .f .fi svg{width:23px;height:23px;color:var(--marron-ink)}
  .feat .f h3{font-size:19px;font-weight:700}
  .feat .f p{font-size:15px;line-height:1.55;color:#5b4a32}

  .cta-band{background:var(--amarillo);position:relative;overflow:hidden;padding:84px 0}
  .cta-band .monkey{position:absolute;right:-40px;bottom:-90px;width:340px;opacity:.9;z-index:0}
  .cta-inner{position:relative;z-index:2;max-width:760px}
  .cta-band h2{font-size:clamp(32px,4.4vw,54px);font-weight:800;color:var(--marron-ink)}
  .cta-band p{font-size:18.5px;line-height:1.5;color:#5c4413;margin:20px 0 32px;max-width:560px}
  .cta-actions{display:flex;flex-wrap:wrap;gap:14px}
  .cta-band .phone{display:inline-flex;align-items:center;gap:10px;margin-top:26px;font-family:var(--mono);font-size:14px;font-weight:700;color:var(--marron-ink)}

  footer{background:var(--obsidiana);color:#cbbfae;padding:64px 0 34px}
  .foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:40px;padding-bottom:42px;border-bottom:1px solid rgba(255,255,255,.1)}
  .foot-brand p{font-size:14.5px;line-height:1.6;color:#a99e8c;margin-top:16px;max-width:300px}
  .foot-col h4{font-family:var(--mono);font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--amarillo);margin-bottom:16px}
  .foot-col a,.foot-col p{display:block;font-size:14.5px;color:#cbbfae;margin-bottom:11px;transition:color .15s}
  .foot-col a:hover{color:#fff}
  .foot-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:24px;flex-wrap:wrap;gap:12px}
  .foot-bottom p{font-size:13px;color:#857b6c}

  .anim .reveal{opacity:0;transform:translateY(26px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
  .anim .reveal.in{opacity:1;transform:none}

  .wa-float{position:fixed;right:22px;bottom:22px;z-index:80;width:60px;height:60px;border-radius:50%;background:var(--spearmint);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 30px -8px rgba(46,158,108,.7);transition:transform .2s}
  .wa-float:hover{transform:scale(1.08)}
  .wa-float svg{width:30px;height:30px;color:#fff}

  .mobile-menu{display:none;flex-direction:column;gap:4px;padding:14px 28px 24px;background:var(--porcelana);border-bottom:1px solid rgba(58,38,7,.1)}
  .mobile-menu a{padding:12px 0;font-weight:600;font-size:16px;border-bottom:1px solid rgba(58,38,7,.07)}
  .mobile-menu .btn{margin-top:14px}

  @media(max-width:980px){
    .hero-grid{grid-template-columns:1fr;gap:40px}
    .styles-grid{grid-template-columns:repeat(3,1fr)}
    .results-grid{grid-template-columns:1fr 1fr}
  }
  @media(max-width:760px){
    .nav-links,.nav-cta .btn:not(.burger){display:none}
    .burger{display:flex}
    .nav-cta{gap:0}
    .steps{grid-template-columns:1fr}
    .feat{grid-template-columns:1fr;gap:22px}
    .styles-grid{grid-template-columns:repeat(2,1fr)}
    .results-grid{grid-template-columns:1fr}
    .rcard.big{grid-row:auto}
    section.sec{padding:70px 0}
    .hero{padding:44px 0 56px}
    .mobile-menu.open{display:flex}
  }
`;

const WA_ICON = (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.247-.694.247-1.29.173-1.414z" />
  </svg>
);

export default function LandingPage() {
  const baRef = useRef<HTMLDivElement>(null);
  const beforeRef = useRef<HTMLImageElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  // Before / After slider
  useEffect(() => {
    const ba = baRef.current;
    const before = beforeRef.current;
    const handle = handleRef.current;
    if (!ba || !before || !handle) return;
    let dragging = false;

    function setPos(clientX: number) {
      const r = ba!.getBoundingClientRect();
      let pct = ((clientX - r.left) / r.width) * 100;
      pct = Math.max(2, Math.min(98, pct));
      before!.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      handle!.style.left = pct + "%";
    }

    const onDown = (e: PointerEvent) => { dragging = true; ba.setPointerCapture(e.pointerId); setPos(e.clientX); };
    const onMove = (e: PointerEvent) => { if (dragging) setPos(e.clientX); };
    const onUp = () => { dragging = false; };

    ba.addEventListener("pointerdown", onDown);
    ba.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);

    // Hint animation
    let t = 0;
    const hint = setInterval(() => {
      t += 1;
      const pct = 50 + Math.sin(t / 6) * 16;
      before.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      handle.style.left = pct + "%";
      if (t > 30) { clearInterval(hint); before.style.clipPath = "inset(0 50% 0 0)"; handle.style.left = "50%"; }
    }, 45);
    ba.addEventListener("pointerdown", () => clearInterval(hint), { once: true });

    return () => {
      ba.removeEventListener("pointerdown", onDown);
      ba.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      clearInterval(hint);
    };
  }, []);

  // Scroll reveal
  useEffect(() => {
    document.body.classList.add("anim");
    const reveals = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver((ents) => {
      ents.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });
    reveals.forEach((el, i) => {
      (el as HTMLElement).style.transitionDelay = (i % 3) * 60 + "ms";
      io.observe(el);
    });
    setTimeout(() => reveals.forEach(el => el.classList.add("in")), 700);
    return () => { io.disconnect(); document.body.classList.remove("anim"); };
  }, []);

  // Mobile menu
  function toggleMenu() {
    document.getElementById("mobileMenu")?.classList.toggle("open");
  }
  function closeMenu() {
    document.getElementById("mobileMenu")?.classList.remove("open");
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* HEADER */}
      <header>
        <div className="wrap nav">
          <a href="#top" className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo/Logo_circulo.webp" alt="Moonkey" />
            <span className="bt"><b>Moonkey</b><span>Studio IA</span></span>
          </a>
          <nav className="nav-links">
            <a href="#como" onClick={closeMenu}>Cómo funciona</a>
            <a href="#estilos" onClick={closeMenu}>Estilos</a>
            <a href="#resultados" onClick={closeMenu}>Resultados</a>
            <a href="#ventajas" onClick={closeMenu}>Ventajas</a>
          </nav>
          <div className="nav-cta">
            <a href="https://wa.me/51983567826?text=Hola%20Moonkey%2C%20quiero%20saber%20m%C3%A1s%20sobre%20Studio%20IA" target="_blank" rel="noopener" className="btn btn-wa btn-sm">WhatsApp</a>
            <a href="/login" className="btn btn-login btn-sm">Iniciar sesión</a>
            <button className="burger" onClick={toggleMenu} aria-label="Menú">
              <span /><span /><span />
            </button>
          </div>
        </div>
        <div className="mobile-menu" id="mobileMenu">
          <a href="#como" onClick={closeMenu}>Cómo funciona</a>
          <a href="#estilos" onClick={closeMenu}>Estilos</a>
          <a href="#resultados" onClick={closeMenu}>Resultados</a>
          <a href="#ventajas" onClick={closeMenu}>Ventajas</a>
          <a href="/login" className="btn btn-login" onClick={closeMenu}>Iniciar sesión</a>
          <a href="https://wa.me/51983567826" target="_blank" rel="noopener" className="btn btn-wa" onClick={closeMenu}>Escríbenos por WhatsApp</a>
        </div>
      </header>

      <span id="top" />

      {/* HERO */}
      <section className="hero">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow">Fotos de producto con IA</span>
            <h1>Convierte la foto de tu celular en una imagen que <span className="hl">vende</span>.</h1>
            <p className="lede">Sube la foto de tu producto, elige un estilo y en segundos obtienes una imagen profesional lista para tu catálogo, tienda online y redes. Sin estudio, sin fotógrafo, sin Photoshop.</p>
            <div className="hero-cta">
              <a href="https://wa.me/51983567826?text=Hola%20Moonkey%2021%2C%20quiero%20realizar%20pruebas%20gratuitas%20en%20Moonkey%20Studio%20IA" target="_blank" rel="noopener" className="btn btn-yellow">Probar gratis</a>
              <a href="/login" className="btn btn-login">
                <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                Iniciar sesión
              </a>
            </div>
            <div className="hero-meta">
              <div className="chip"><span className="dotg" /> Listo en segundos</div>
              <div className="chip"><span className="dotg" /> Varios estilos por foto</div>
              <div className="chip"><span className="dotg" /> Descarga en alta calidad</div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="ba" ref={baRef}>
              {/* Slider interactivo: se mantiene <img> nativo porque el clip-path
                  y la posición se manipulan por ref. Above-the-fold → carga eager. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="after" src="/images/despues-real.png" alt="Resultado profesional generado con Moonkey IA" fetchPriority="high" decoding="async" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="before" ref={beforeRef} src="/images/antes-real.png" alt="Foto original tomada con el celular" fetchPriority="high" decoding="async" />
              <span className="lab lab-b">Antes · tu foto</span>
              <span className="lab lab-a">Después · Moonkey Studio</span>
              <div className="tag">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo/Logo_circulo.webp" alt="" />
                <span>Generado con IA</span>
              </div>
              <div className="handle" ref={handleRef}>
                <div className="knob">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" /><polyline points="9 6 3 12 9 18" transform="translate(12 0)" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MARQUEE */}
      <div className="marquee" aria-hidden="true">
        <div className="mq-track">
          <span>Fondo blanco</span><span>Modelo de pie</span><span>Catálogo</span>
          <span>Running</span><span>Estilo urbano</span><span>Fondo blanco</span>
          <span>Modelo de pie</span><span>Catálogo</span><span>Running</span><span>Estilo urbano</span>
        </div>
      </div>

      {/* COMO FUNCIONA */}
      <section className="sec" id="como">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Cómo funciona</span>
            <h2>De foto normal a foto pro en 3 pasos.</h2>
            <p>Pensado para que cualquier emprendedor lo use desde el celular, sin saber de diseño ni de fotografía.</p>
          </div>
          <div className="steps">
            <div className="step reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg></div>
              <div className="num">01</div>
              <h3>Sube tu foto</h3>
              <p>Toma una foto con tu celular o elige una de tu galería. Funciona con cualquier producto: zapatillas, ropa, accesorios, electrónica y más.</p>
            </div>
            <div className="step reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7.4-6.3-4.6L5.7 21.4 8 14 2 9.4h7.6z" /></svg></div>
              <div className="num">02</div>
              <h3>Elige el estilo</h3>
              <p>Fondo blanco para catálogo, un modelo usándolo, ambiente urbano o running. De una foto a varios estilos prediseñados o puedes solicitar tus estilos propios.</p>
            </div>
            <div className="step reveal">
              <div className="ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg></div>
              <div className="num">03</div>
              <h3>Descarga y vende</h3>
              <p>Generamos tu imagen en segundos. Descárgala en alta calidad y úsala en tu tienda, marketplace o redes sociales al instante.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ESTILOS */}
      <section className="sec dark" id="estilos">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Estilos disponibles</span>
            <h2>Un estilo para cada forma de vender.</h2>
            <p>La misma foto, transformada en distintas escenas profesionales. Genera todas las que necesites para tu catálogo y tus redes.</p>
          </div>
          <div className="styles-grid">
            {[
              { src: "/styles/fondo-blanco.webp", label: "Fondo blanco", n: "01" },
              { src: "/styles/modelo-de-pie.webp", label: "Modelo de pie", n: "02" },
              { src: "/styles/modelo-catalogo.webp", label: "Catálogo", n: "03" },
              { src: "/styles/modelo-running.webp", label: "Running", n: "04" },
              { src: "/styles/modelo-agachado-urbano.webp", label: "Estilo urbano", n: "05" },
            ].map(({ src, label, n }) => (
              <div key={n} className="style-card reveal">
                <Image
                  src={src}
                  alt={label}
                  fill
                  sizes="(max-width:760px) 50vw, (max-width:980px) 33vw, 20vw"
                  style={{ objectFit: "cover" }}
                />
                <div className="cap"><b>{n}</b> {label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTADOS */}
      <section className="sec" id="resultados">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Resultados reales</span>
            <h2>Funciona con cualquier producto.</h2>
            <p>Desde sneakers hasta electrónica o moda: Moonkey Studio entiende tu producto y lo pone en una escena que se ve hecha por un estudio profesional.</p>
          </div>
          <div className="results-grid">
            {/* Nativo: el grid no define altura, depende de las dimensiones
                intrínsecas de la imagen — next/image fill colapsaría las celdas. */}
            <div className="rcard big reveal"><span className="rt">Sneakers · Urbano</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/hero.png" alt="Resultado sneaker" loading="lazy" decoding="async" />
            </div>
            <div className="rcard reveal"><span className="rt">Electrónica · Minimal</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/catalog.png" alt="Resultado parlante" loading="lazy" decoding="async" />
            </div>
            <div className="rcard reveal"><span className="rt">Moda · Editorial</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/design.png" alt="Resultado bolso" loading="lazy" decoding="async" />
            </div>
          </div>
        </div>
      </section>

      {/* VENTAJAS */}
      <section className="sec" id="ventajas" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Por qué Moonkey Studio</span>
            <h2>Tu estudio fotográfico, dentro del celular.</h2>
          </div>
          <div className="feat">
            <div className="f reveal">
              <div className="fi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg></div>
              <h3>Rápido de verdad</h3>
              <p>Resultados en segundos. Genera fotos para todo tu catálogo en una tarde, no en semanas.</p>
            </div>
            <div className="f reveal">
              <div className="fi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></div>
              <h3>Sin complicaciones</h3>
              <p>Nada de estudio, luces ni programas de edición. Si sabes tomar una foto, sabes usar Moonkey Studio.</p>
            </div>
            <div className="f reveal">
              <div className="fi"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg></div>
              <h3>Organizado por proyectos</h3>
              <p>Cada pedido queda guardado en tu historial. Vuelve cuando quieras a descargar tus imágenes.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="cta-band" id="probar">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="monkey" src="/logo/logo.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" />
        <div className="wrap cta-inner reveal">
          <h2>Empieza a vender con mejores fotos hoy.</h2>
          <p>Prueba Moonkey Studio IA gratis y transforma tu primera foto en segundos. ¿Tienes dudas? Escríbenos por WhatsApp y te ayudamos.</p>
          <div className="cta-actions">
            <a href="/login" className="btn btn-login">Iniciar sesión</a>
            <a href="https://wa.me/51983567826?text=Hola%20Moonkey%2C%20quiero%20empezar%20con%20Studio%20IA" target="_blank" rel="noopener" className="btn btn-wa">
              {WA_ICON} +51 983 567 826
            </a>
          </div>
          <div className="phone">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
            Atención por WhatsApp · Perú
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="wrap">
          <div className="foot-grid">
            <div className="foot-brand">
              <div className="brand">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo/Logo_circulo.webp" alt="Moonkey" style={{ width: 40, height: 40, borderRadius: "50%" }} loading="lazy" decoding="async" />
                <span className="bt" style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
                  <b style={{ fontFamily: "var(--disp)", fontWeight: 800, fontSize: 18, color: "#fff" }}>Moonkey</b>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 9.5, letterSpacing: ".32em", color: "var(--amarillo)", textTransform: "uppercase", marginTop: 2 }}>Studio IA</span>
                </span>
              </div>
              <p>Fotos de producto profesionales generadas con inteligencia artificial. Vende mejor, sin estudio ni fotógrafo.</p>
            </div>
            <div className="foot-col">
              <h4>Navegación</h4>
              <a href="#como">Cómo funciona</a>
              <a href="#estilos">Estilos</a>
              <a href="#resultados">Resultados</a>
              <a href="#ventajas">Ventajas</a>
            </div>
            <div className="foot-col">
              <h4>Contacto</h4>
              <a href="https://wa.me/51983567826" target="_blank" rel="noopener">WhatsApp · +51 983 567 826</a>
              <a href="/login">Iniciar sesión</a>
            </div>
          </div>
          <div className="foot-bottom">
            <p>© 2026 Moonkey Studio IA. Todos los derechos reservados.</p>
            <p>Diseñado para vender</p>
          </div>
        </div>
      </footer>

      {/* WHATSAPP FLOTANTE */}
      <a className="wa-float" href="https://wa.me/51983567826?text=Hola%20Moonkey%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n" target="_blank" rel="noopener" aria-label="WhatsApp">
        {WA_ICON}
      </a>
    </>
  );
}
