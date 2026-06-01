"use client";

import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-zinc-800 selection:text-white dark:selection:bg-zinc-200 dark:selection:text-black">
      <ThemeToggle />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Image src="/logo/Logo_circulo.webp" alt="Moonkey IA Studio Logo" width={48} height={48} className="rounded-full shadow-lg" />
          <h1 className="text-2xl font-bold tracking-tight">Moonkey<span className="font-light">IA</span>Studio</h1>
        </div>
        <div className="flex items-center gap-6">
          <a href="https://wa.me/983567826" target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:opacity-70 transition-opacity flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            +51 983567826
          </a>
          <Link href="/login" className="px-6 py-2.5 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-medium text-sm hover:scale-105 transition-transform shadow-lg">
            Ingresar
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-24 pb-12 px-6 lg:px-24">
        {/* Abstract Background Element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-tr from-zinc-200 to-zinc-50 dark:from-zinc-900 dark:to-zinc-800 rounded-full blur-3xl opacity-50 -z-10 animate-pulse-slow"></div>

        <div className="grid lg:grid-cols-2 gap-16 items-center w-full max-w-7xl mx-auto">
          <div className="space-y-8 relative z-10">
            <h2 className="text-6xl sm:text-7xl lg:text-8xl font-black leading-[1.1] tracking-tighter">
              Imagina.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-800 dark:from-zinc-400 dark:to-zinc-100">
                Transforma.
              </span><br />
              Crea.
            </h2>
            <p className="text-xl text-zinc-600 dark:text-zinc-400 max-w-lg leading-relaxed">
              Sube tus imágenes y descubre el poder de la IA. Genera versiones perfectas para tu catálogo, web o diseños exclusivos como si fueras un gran creativo.
            </p>
            <div className="flex gap-4">
              <Link href="/upload" className="group relative px-8 py-4 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-bold overflow-hidden transition-all hover:shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] dark:hover:shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]">
                <span className="relative z-10 flex items-center gap-2">
                  Empezar Ahora
                  <svg className="group-hover:translate-x-1 transition-transform" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </span>
                <div className="absolute inset-0 bg-white/20 dark:bg-black/10 translate-y-full group-hover:translate-y-0 transition-transform rounded-full"></div>
              </Link>
            </div>
          </div>
          <div className="relative z-10 aspect-[4/5] rounded-[2.5rem] overflow-hidden shadow-2xl group">
            <Image 
              src="/images/hero.png" 
              alt="Hero Fashion Sneaker AI" 
              fill 
              className="object-cover group-hover:scale-105 transition-transform duration-700 ease-out" 
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end p-8">
              <p className="text-white font-medium text-lg">Dirección Creativa por IA</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Showcase */}
      <section className="py-24 px-6 lg:px-24 bg-zinc-50 dark:bg-zinc-950/50">
        <div className="max-w-7xl mx-auto space-y-24">
          <div className="text-center space-y-4">
            <h3 className="text-4xl lg:text-5xl font-bold tracking-tight">Diseñado para cada necesidad</h3>
            <p className="text-lg text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto">Selecciona el estilo y propósito de tus imágenes. Nosotros nos encargamos de que luzcan espectaculares.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative aspect-square rounded-[2rem] overflow-hidden shadow-xl group">
              <Image src="/images/catalog.png" alt="Catálogo Profesional" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
            <div className="order-1 md:order-2 space-y-6 lg:pl-12">
              <div className="w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              </div>
              <h4 className="text-3xl font-bold">Catálogo Impecable</h4>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Genera imágenes de producto perfectas, limpias y listas para tu e-commerce. Aumenta tus ventas con fotografía comercial de altísima calidad sin salir del estudio.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 lg:pr-12">
              <div className="w-16 h-16 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
              </div>
              <h4 className="text-3xl font-bold">Web & Diseño Creativo</h4>
              <p className="text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Eleva el diseño de tu sitio web con composiciones vibrantes y surrealistas. Deja que la IA explore nuevas dimensiones estéticas para tu marca.
              </p>
            </div>
            <div className="relative aspect-square rounded-[2rem] overflow-hidden shadow-xl group">
              <Image src="/images/design.png" alt="Diseño Creativo Web" fill className="object-cover group-hover:scale-110 transition-transform duration-700" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-zinc-900 dark:bg-white z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/hero.png')] bg-cover bg-center opacity-10 dark:opacity-20 z-0 blur-sm mix-blend-overlay"></div>
        <div className="relative z-10 max-w-3xl mx-auto space-y-8">
          <h2 className="text-5xl lg:text-7xl font-black text-white dark:text-zinc-900 tracking-tighter">
            Tu estudio, <br />tus reglas.
          </h2>
          <p className="text-xl text-zinc-300 dark:text-zinc-600">
            Únete a cientos de creativos y marcas que ya están revolucionando su contenido visual.
          </p>
          <div className="pt-8">
            <Link href="/upload" className="inline-block px-10 py-5 rounded-full bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white font-bold text-lg hover:scale-105 transition-transform shadow-2xl">
              Comienza a crear ahora
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 text-center border-t border-zinc-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo/logo.webp" alt="Moonkey IA Studio" width={100} height={30} className="object-contain" />
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            © {new Date().getFullYear()} Moonkey IA Studio. Todos los derechos reservados.
          </p>
          <a href="https://wa.me/983567826" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors">
            Soporte: WhatsApp 983567826
          </a>
        </div>
      </footer>
    </div>
  );
}
