import { useState, useEffect } from "react";
import Sketch from "react-p5";
import { useSpring, animated, config } from "@react-spring/web";
import btsLogo from "@assets/bts-logo-transparent.png";
import type p5Types from "p5";

interface PreloaderProps {
  onLoadComplete: () => void;
}

export default function Preloader({ onLoadComplete }: PreloaderProps) {
  const [phase, setPhase] = useState<"zoom" | "shake" | "exit" | "complete">("zoom");
  const [captionText, setCaptionText] = useState("Initializing");
  
  // Food particles for p5.js background
  const foodParticles: any[] = [];
  const foodEmojis = ["🍕", "🍔", "🍟", "🌮", "🍜", "🍱", "🍣", "🥘", "🍝", "🍖"];
  
  // Animated captions
  const captions = [
    "Initializing BTS Delivery...",
    "Loading delicious possibilities...",
    "Connecting to restaurants...",
    "Preparing your experience...",
    "Almost ready to serve..."
  ];
  
  // Caption animation
  useEffect(() => {
    let captionIndex = 0;
    const interval = setInterval(() => {
      if (phase !== "complete") {
        captionIndex = (captionIndex + 1) % captions.length;
        setCaptionText(captions[captionIndex]);
      }
    }, 1500);
    
    return () => clearInterval(interval);
  }, [phase]);
  
  // Logo animation phases
  const logoSpring = useSpring({
    from: { 
      scale: 0.3, 
      opacity: 0, 
      x: 0,
      rotate: 0 
    },
    to: async (next) => {
      // Phase 1: Zoom in (1 second)
      await next({ 
        scale: 1.2, 
        opacity: 1, 
        x: 0,
        rotate: 0,
        config: { duration: 1000 } 
      });
      
      setPhase("shake");
      
      // Phase 2: Shake effect (2 seconds total)
      const shakeCount = 10; // Fewer shakes for 2 seconds
      for (let i = 0; i < shakeCount; i++) {
        await next({ 
          x: -8,
          rotate: -3,
          config: { duration: 100 } 
        });
        await next({ 
          x: 8,
          rotate: 3,
          config: { duration: 100 } 
        });
      }
      await next({ 
        x: 0,
        rotate: 0,
        config: { duration: 100 } 
      });
      
      setPhase("exit");
      
      // Phase 3: Extended exit to right (1.2 seconds for visibility)
      await next({ 
        x: window.innerWidth + 300,
        scale: 0.6,
        opacity: 0,
        rotate: 720,
        config: { duration: 1200, easing: t => t * t * t } // Slower for visibility
      });
      
      setPhase("complete");
      setTimeout(onLoadComplete, 100);
    }
  });
  
  // Caption animation
  const captionSpring = useSpring({
    from: { opacity: 0, y: 20 },
    to: { opacity: phase === "complete" ? 0 : 1, y: 0 },
    config: config.gentle
  });
  
  // Loading bar animation
  const progressSpring = useSpring({
    from: { width: "0%" },
    to: { width: phase === "complete" ? "100%" : phase === "exit" ? "80%" : phase === "shake" ? "60%" : "40%" },
    config: config.slow
  });
  
  // P5.js setup for 3D food background
  const setup = (p5: p5Types, canvasParentRef: Element) => {
    p5.createCanvas(window.innerWidth, window.innerHeight, p5.WEBGL).parent(canvasParentRef);
    
    // Initialize food particles
    for (let i = 0; i < 20; i++) {
      foodParticles.push({
        x: p5.random(-p5.width / 2, p5.width / 2),
        y: p5.random(-p5.height / 2, p5.height / 2),
        z: p5.random(-500, 500),
        rotX: p5.random(p5.TWO_PI),
        rotY: p5.random(p5.TWO_PI),
        rotZ: p5.random(p5.TWO_PI),
        size: p5.random(30, 80),
        speed: p5.random(0.001, 0.003),
        emoji: p5.random(foodEmojis),
        color: {
          r: p5.random(200, 255),
          g: p5.random(100, 200),
          b: p5.random(50, 150)
        }
      });
    }
  };
  
  // P5.js draw loop
  const draw = (p5: p5Types) => {
    // Dark gradient background
    p5.clear(0, 0, 0, 0);
    
    // Ambient lighting
    p5.ambientLight(100);
    p5.directionalLight(255, 255, 255, 0.25, 0.25, -1);
    
    // Rotate camera slightly
    p5.rotateY(p5.frameCount * 0.001);
    
    // Draw food particles
    foodParticles.forEach((particle, index) => {
      p5.push();
      
      // Position
      p5.translate(particle.x, particle.y, particle.z);
      
      // Rotation animation
      p5.rotateX(particle.rotX + p5.frameCount * particle.speed);
      p5.rotateY(particle.rotY + p5.frameCount * particle.speed * 1.3);
      p5.rotateZ(particle.rotZ + p5.frameCount * particle.speed * 0.7);
      
      // Set material and color
      p5.fill(particle.color.r, particle.color.g, particle.color.b, 150);
      p5.noStroke();
      
      // Draw 3D shapes (representing food)
      const shapeType = index % 4;
      switch(shapeType) {
        case 0: // Pizza slice (cone)
          p5.cone(particle.size * 0.7, particle.size);
          break;
        case 1: // Burger (cylinder)
          p5.cylinder(particle.size * 0.8, particle.size * 0.6);
          break;
        case 2: // Donut (torus)
          p5.torus(particle.size * 0.5, particle.size * 0.2);
          break;
        case 3: // Box (for takeout)
          p5.box(particle.size);
          break;
      }
      
      p5.pop();
      
      // Update particle position for floating effect
      particle.y += p5.sin(p5.frameCount * 0.01 + index) * 0.5;
      particle.x += p5.cos(p5.frameCount * 0.008 + index) * 0.3;
      
      // Wrap around edges
      if (particle.x > p5.width / 2) particle.x = -p5.width / 2;
      if (particle.x < -p5.width / 2) particle.x = p5.width / 2;
      if (particle.y > p5.height / 2) particle.y = -p5.height / 2;
      if (particle.y < -p5.height / 2) particle.y = p5.height / 2;
    });
    
    // Add some floating text/emojis as 2D overlay
    p5.push();
    p5.translate(0, 0, 500);
    for (let i = 0; i < 5; i++) {
      const x = p5.sin(p5.frameCount * 0.01 + i * 1.5) * 200;
      const y = p5.cos(p5.frameCount * 0.008 + i * 2) * 150;
      p5.push();
      p5.translate(x, y, 0);
      p5.rotateZ(p5.frameCount * 0.02);
      p5.fill(255, 255, 255, 100);
      p5.pop();
    }
    p5.pop();
  };
  
  const windowResized = (p5: p5Types) => {
    p5.resizeCanvas(window.innerWidth, window.innerHeight);
  };
  
  return (
    <div className="fixed inset-0 z-[9999] bg-gradient-to-br from-orange-950 via-green-950 to-yellow-950 overflow-hidden">
      {/* P5.js 3D Background */}
      <div className="absolute inset-0 opacity-30">
        <Sketch setup={setup} draw={draw} windowResized={windowResized} />
      </div>
      
      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/30" />
      
      {/* Main content container */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        {/* Animated Logo */}
        <animated.div
          style={{
            transform: logoSpring.x.to(x => `translateX(${x}px)`),
            scale: logoSpring.scale,
            opacity: logoSpring.opacity,
            rotate: logoSpring.rotate.to(r => `${r}deg`),
          }}
          className="relative"
        >
          <div className="relative w-64 h-64 md:w-80 md:h-80 rounded-full bg-white/95 backdrop-blur-sm p-8 shadow-2xl overflow-hidden">
            <img
              src={btsLogo}
              alt="BTS Delivery"
              className="w-full h-full object-contain"
            />
            
            {/* Inner glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 via-transparent to-green-500/20 rounded-full" />
          </div>
          
          {/* Outer glow effect */}
          <div className="absolute inset-0 bg-orange-500/20 blur-3xl animate-pulse rounded-full" />
        </animated.div>
        
        {/* Animated Caption */}
        <animated.div
          style={captionSpring}
          className="mt-8 text-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {captionText}
          </h2>
          <p className="text-white/70 text-sm md:text-base">
            {phase === "zoom" && "🚀 Preparing your delivery experience"}
            {phase === "shake" && "🍔 Loading delicious options"}
            {phase === "exit" && "✨ Almost ready to serve you"}
            {phase === "complete" && "🎉 Welcome to BTS Delivery!"}
          </p>
        </animated.div>
        
        {/* Loading Bar */}
        <div className="mt-12 w-64 md:w-96">
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <animated.div
              style={progressSpring}
              className="h-full bg-gradient-to-r from-orange-500 via-yellow-500 to-green-500 rounded-full"
            />
          </div>
          
          {/* Loading dots animation */}
          <div className="mt-4 flex justify-center gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-white/50 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
        </div>
        
        {/* Floating food emojis */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {foodEmojis.map((emoji, i) => (
            <div
              key={i}
              className="absolute text-4xl animate-float"
              style={{
                left: `${10 + i * 8}%`,
                top: `${10 + (i % 3) * 30}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${10 + i * 2}s`
              }}
            >
              {emoji}
            </div>
          ))}
        </div>
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) rotate(0deg);
            opacity: 0.3;
          }
          25% {
            transform: translateY(-30px) rotate(90deg);
            opacity: 0.5;
          }
          50% {
            transform: translateY(20px) rotate(180deg);
            opacity: 0.7;
          }
          75% {
            transform: translateY(-20px) rotate(270deg);
            opacity: 0.5;
          }
        }
        
        .animate-float {
          animation: float linear infinite;
        }
      `}</style>
    </div>
  );
}