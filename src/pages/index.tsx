import Link from 'next/link';
import { useState, useEffect } from 'react';
import { ChevronRight, Bot, Zap, Shield, Cpu } from 'lucide-react';

export default function Home() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
    
    const handleMouseMove = (e : any) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <>
      {/* <Head>
        <title>TaskBot</title>
      </Head> */}

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
        {/* Animated Background Elements */}
        <div className="absolute inset-0">
          {/* Floating Orbs */}
          <div className="absolute top-20 left-20 w-64 h-64 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full opacity-20 blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full opacity-20 blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-emerald-400 to-cyan-500 rounded-full opacity-10 blur-3xl animate-pulse delay-500"></div>
          
          {/* Grid Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 gap-8 h-full">
              {Array.from({ length: 144 }).map((_, i) => (
                <div 
                  key={i} 
                  className="border border-cyan-500/20 animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                ></div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="relative z-10 min-h-screen flex items-center justify-center p-6">
          <div 
            className={`max-w-4xl mx-auto text-center transition-all duration-1000 ${
              isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{
              transform: `translate(${mousePosition.x * 0.5}px, ${mousePosition.y * 0.5}px)`
            }}
          >
            {/* Logo/Icon */}
            <div className="relative mb-8">
              <div className="w-32 h-32 mx-auto relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 rounded-2xl rotate-45 animate-spin-slow opacity-80"></div>
                <div className="absolute inset-2 bg-slate-900 rounded-xl flex items-center justify-center">
                  <Bot className="w-12 h-12 text-cyan-400 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-6xl md:text-7xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent animate-pulse">
              Task
            </h1>
            <h2 className="text-5xl md:text-6xl font-black mb-8 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 bg-clip-text text-transparent">
              Bot
            </h2>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Sistema de gerenciamento e monitoramento robótico 
              <span className="block text-cyan-400 font-semibold mt-2">
                CHAMA !!! 
              </span>
            </p>

            {/* Features Grid */}
            {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              {[
                { icon: Zap, title: 'Ajuda na Organização', desc: 'Velocidade otimizada' },
                { icon: Shield, title: 'Segurança Total', desc: 'Proteção avançada' },
                { icon: Cpu, title: 'IA Integrada', desc: 'Inteligência artificial' }
              ].map((feature, index) => (
                <div 
                  key={index}
                  className={`group p-6 rounded-2xl bg-slate-800/40 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-400/50 transition-all duration-500 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20 ${
                    isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                  style={{ animationDelay: `${index * 200}ms` }}
                >
                  <feature.icon className="w-8 h-8 text-cyan-400 mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-slate-400 text-sm">{feature.desc}</p>
                </div>
              ))}
            </div> */}

            {/* CTA Button */}
            <Link href="/robots">
              <button className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white font-bold text-xl px-12 py-6 rounded-2xl shadow-2xl hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 transform">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center justify-center gap-3">
                  <Bot className="w-6 h-6 group-hover:animate-bounce" />
                  <span>Acessar Agenda de Robôs</span>
                  <ChevronRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-300" />
                </div>
                
                {/* Animated border */}
                <div className="absolute inset-0 rounded-2xl opacity-75">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 animate-pulse"></div>
                </div>
              </button>
            </Link>

            {/* Status Indicator */}
            {/* <div className="mt-12 flex items-center justify-center gap-2 text-emerald-400">
              <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Sistema Online</span>
            </div> */}
          </div>
        </main>

        {/* Floating Action Elements */}
        <div className="absolute bottom-8 left-8">
          <div className="flex flex-col gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div 
                key={i}
                className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 300}ms` }}
              ></div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 right-8">
          <div className="text-right text-slate-500 text-xs">
            <div>Desenvolvido por</div>
            <div>Vitor Bansen</div>
          </div>
        </div>

        <style jsx>{`
          @keyframes spin-slow {
            from { transform: rotate(45deg); }
            to { transform: rotate(405deg); }
          }
          
          .animate-spin-slow {
            animation: spin-slow 8s linear infinite;
          }
        `}</style>
      </div>
    </>
  );
}