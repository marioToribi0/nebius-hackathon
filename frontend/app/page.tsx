import Link from "next/link";
import {
  Compass,
  Brain,
  Navigation,
  Sparkles,
  MapPin,
  Zap,
  Bot,
  Search,
  Activity,
  Code,
  Database,
} from "lucide-react";

export default function RootPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-heading text-xl font-bold text-foreground">
            <Compass className="w-6 h-6 text-primary" />
            Wayfinder G1
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#gallery" className="hover:text-foreground transition-colors">Gallery</a>
            <a href="#tech" className="hover:text-foreground transition-colors">Tech</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-sm rounded-lg border border-border text-foreground hover:bg-secondary transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/5 via-transparent to-accent/5 flex items-center">
        <div className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center w-full">
          {/* Left */}
          <div className="space-y-8">
            <div
              className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm font-medium"
              style={{ animationDelay: "0s" }}
            >
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              Powered by Nebius AI Studio &amp; Tavily
            </div>
            <h1
              className="animate-fade-in-up font-heading text-5xl lg:text-6xl font-bold leading-tight text-foreground"
              style={{ animationDelay: "0.1s" }}
            >
              Your World,<br />
              <span className="text-primary">Guided by AI.</span>
            </h1>
            <p
              className="animate-fade-in-up text-lg text-muted-foreground max-w-lg leading-relaxed"
              style={{ animationDelay: "0.2s" }}
            >
              Wayfinder G1 pairs a Unitree humanoid robot with real-time AI research to deliver
              personalized, embodied tours of any location — on demand.
            </p>
            <div
              className="animate-fade-in-up flex flex-wrap gap-4"
              style={{ animationDelay: "0.3s" }}
            >
              <Link
                href="/signup"
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
              >
                Start Your Tour
              </Link>
              <a
                href="#how-it-works"
                className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-secondary transition-colors"
              >
                See How It Works
              </a>
            </div>
            <div
              className="animate-fade-in-up flex gap-8 pt-2"
              style={{ animationDelay: "0.4s" }}
            >
              {[
                { label: "Real-Time", desc: "Live data" },
                { label: "Embodied", desc: "Physical robot" },
                { label: "Dynamic", desc: "Unique every time" },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="font-heading font-bold text-foreground">{stat.label}</div>
                  <div className="text-xs text-muted-foreground">{stat.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Robot portrait */}
          <div className="relative animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            <div className="rounded-2xl overflow-hidden shadow-2xl aspect-[3/4] bg-gradient-to-br from-secondary to-border">
              <img
                src="/robot-hero.jpg"
                alt="Unitree G1 robot guide"
                className="object-cover w-full h-full"
              />
            </div>
            {/* Floating card */}
            <div className="absolute bottom-6 left-6 warm-card px-4 py-3 flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <div>
                <div className="text-xs font-semibold text-foreground">Live Tour Active</div>
                <div className="text-xs text-muted-foreground">Old Town District</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl font-bold text-foreground mb-4">Built Different</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Three pillars that make every Wayfinder tour unlike anything else.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <Brain className="w-8 h-8 text-accent" />,
                title: "Real-Time Intelligence",
                desc: "Tavily powers live research so your guide always has fresh context — opening hours, current events, local lore — the moment you ask.",
              },
              {
                icon: <Navigation className="w-8 h-8 text-primary" />,
                title: "Embodied Navigation",
                desc: "The Unitree G1 robot physically walks alongside you, gesturing and pointing to landmarks with human-like presence.",
              },
              {
                icon: <Sparkles className="w-8 h-8 text-primary" />,
                title: "Personalized Narratives",
                desc: "Nebius AI Studio crafts unique stories tailored to your interests — history, architecture, food, nightlife — on the fly.",
              },
            ].map((card) => (
              <div key={card.title} className="warm-card p-8 space-y-4">
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center">
                  {card.icon}
                </div>
                <h3 className="font-heading text-xl font-bold text-foreground">{card.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              From curiosity to guided experience in three steps.
            </p>
          </div>
          <div className="relative flex flex-col md:flex-row items-center justify-center gap-8 md:gap-0">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-border" />
            {[
              { num: "01", icon: <MapPin className="w-6 h-6" />, title: "Drop a Pin", desc: "Tell Wayfinder where you are or where you want to explore.", color: "bg-primary text-primary-foreground" },
              { num: "02", icon: <Zap className="w-6 h-6" />, title: "AI Researches & Writes", desc: "Tavily fetches live data. Nebius crafts your personalized narrative instantly.", color: "bg-accent text-accent-foreground" },
              { num: "03", icon: <Bot className="w-6 h-6" />, title: "Robot Takes You There", desc: "The Unitree G1 leads the way with voice, gesture, and motion.", color: "bg-primary text-primary-foreground" },
            ].map((step) => (
              <div key={step.num} className="relative flex flex-col items-center text-center max-w-xs md:flex-1 px-6">
                <div className={`w-20 h-20 rounded-full ${step.color} flex items-center justify-center shadow-lg mb-6 relative z-10`}>
                  {step.icon}
                </div>
                <div className="font-heading text-xs font-bold text-muted-foreground mb-1">{step.num}</div>
                <h3 className="font-heading text-xl font-bold text-foreground mb-3">{step.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section id="gallery" className="py-24 bg-secondary/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl font-bold text-foreground mb-4">See G1 in Action</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              The Unitree G1 navigating real environments, guided by real AI.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large left slot */}
            <div className="relative lg:row-span-2 rounded-2xl overflow-hidden bg-gradient-to-br from-secondary to-border min-h-[400px]">
              <img
                src="/robot-pointing.jpg"
                alt="G1 robot pointing at landmark"
                className="object-cover w-full h-full absolute inset-0"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-6">
                <div className="text-white">
                  <div className="font-heading text-lg font-bold">Landmark Discovery</div>
                  <div className="text-sm text-white/80">Real-time contextual awareness</div>
                </div>
              </div>
            </div>
            {/* Smaller slots */}
            {[
              { src: "/robot-walking.jpg", alt: "G1 robot walking", label: "Urban Navigation" },
              { src: "/robot-close.jpg", alt: "G1 robot close-up", label: "Human-Scale Presence" },
              { src: "/robot-tour.jpg", alt: "G1 robot on tour", label: "Guided Tour Mode" },
            ].map((img) => (
              <div key={img.src} className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-secondary to-border aspect-video">
                <img
                  src={img.src}
                  alt={img.alt}
                  className="object-cover w-full h-full"
                />
                <div className="absolute bottom-3 left-3">
                  <span className="px-2 py-1 rounded-md bg-black/40 text-white text-xs font-medium backdrop-blur-sm">
                    {img.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech" className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="font-heading text-4xl font-bold text-foreground mb-4">Powered By</h2>
          <p className="text-muted-foreground text-lg mb-12 max-w-xl mx-auto">
            A curated stack built for real-world, real-time embodied AI experiences.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { icon: <Bot className="w-5 h-5 text-accent" />, label: "Nebius AI Studio" },
              { icon: <Search className="w-5 h-5 text-primary" />, label: "Tavily Search" },
              { icon: <Activity className="w-5 h-5 text-primary" />, label: "Unitree G1" },
              { icon: <Code className="w-5 h-5 text-accent" />, label: "Next.js 16" },
              { icon: <Zap className="w-5 h-5 text-primary" />, label: "FastAPI" },
              { icon: <Database className="w-5 h-5 text-accent" />, label: "Vector Embeddings" },
            ].map((tech) => (
              <div key={tech.label} className="warm-card px-5 py-3 flex items-center gap-3">
                {tech.icon}
                <span className="text-sm font-medium text-foreground">{tech.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary to-amber-700">
        <div className="max-w-3xl mx-auto px-6 text-center space-y-8">
          <h2 className="font-heading text-4xl lg:text-5xl font-bold text-white leading-tight">
            The future of tourism is walking toward you.
          </h2>
          <p className="text-white/80 text-lg">
            Join the waitlist and be among the first to experience AI-guided tours with a real humanoid robot.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="px-8 py-3 rounded-xl bg-white text-primary font-semibold hover:bg-white/90 transition-colors shadow-xl"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 rounded-xl bg-white/10 text-white border border-white/20 font-semibold hover:bg-white/20 transition-colors backdrop-blur-sm"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-heading font-bold text-foreground">
            <Compass className="w-5 h-5 text-primary" />
            Wayfinder G1
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#gallery" className="hover:text-foreground transition-colors">Gallery</a>
            <a href="#tech" className="hover:text-foreground transition-colors">Tech</a>
          </div>
          <div className="text-center md:text-right space-y-1">
            <div>© 2026 Wayfinder G1. Built for the Nebius Hackathon.</div>
            <div className="text-xs">Powered by Nebius AI Studio &amp; Tavily</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
