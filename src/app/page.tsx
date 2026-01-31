'use client'

import Link from "next/link";
import { ArrowRight, Receipt, Scan, BarChart3, Shield, Sparkles, Upload } from "lucide-react";
import { motion } from "framer-motion";

// Animation variants
const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-black">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tighter">
            Daticket
          </Link>
          <div className="flex items-center gap-6">
            <Link 
              href="/login" 
              className="text-sm font-bold uppercase tracking-wider hover:text-neutral-600 transition-colors"
            >
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="px-5 py-2 bg-black text-white text-sm font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.2)]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            className="grid lg:grid-cols-2 gap-12 items-center"
            initial="initial"
            animate="animate"
            variants={staggerContainer}
          >
            {/* Left: Content */}
            <div className="space-y-8">
              <motion.div 
                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 border border-black"
                variants={fadeInUp}
              >
                <Sparkles className="h-4 w-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Now with AI Receipt Scanning</span>
              </motion.div>
              
              <motion.h1 
                className="text-5xl md:text-7xl font-bold tracking-tighter leading-[0.9]"
                variants={fadeInUp}
              >
                Track Every
                <span className="block text-swiss-blue">Receipt.</span>
              </motion.h1>
              
              <motion.p 
                className="text-lg md:text-xl text-neutral-600 max-w-md leading-relaxed"
                variants={fadeInUp}
              >
                The Swiss-style expense tracker that turns your paper receipts into organized digital records. Simple, fast, beautiful.
              </motion.p>
              
              <motion.div 
                className="flex flex-col sm:flex-row gap-4"
                variants={fadeInUp}
              >
                <Link 
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 bg-black text-white font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border border-black font-bold uppercase tracking-wider hover:bg-neutral-100 transition-all"
                >
                  Sign In
                </Link>
              </motion.div>

              {/* Trust badges */}
              <motion.div 
                className="flex items-center gap-6 pt-4"
                variants={fadeInUp}
              >
                <div className="flex -space-x-2">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="h-8 w-8 bg-neutral-300 border-2 border-white" />
                  ))}
                </div>
                <p className="text-sm text-neutral-600">
                  <span className="font-bold text-black">2,000+</span> users tracking expenses
                </p>
              </motion.div>
            </div>

            {/* Right: Visual */}
            <motion.div 
              className="relative"
              variants={fadeInUp}
            >
              {/* Abstract receipt visualization */}
              <div className="relative bg-neutral-50 border border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                {/* Receipt header */}
                <div className="flex justify-between items-start border-b-2 border-dashed border-black pb-4 mb-4">
                  <div>
                    <div className="h-3 w-24 bg-black mb-2" />
                    <div className="h-2 w-16 bg-neutral-400" />
                  </div>
                  <div className="text-right">
                    <div className="h-2 w-20 bg-neutral-400 mb-1" />
                    <div className="h-2 w-12 bg-neutral-300" />
                  </div>
                </div>
                
                {/* Receipt items */}
                <div className="space-y-3 mb-4">
                  {[1,2,3].map((i) => (
                    <div key={i} className="flex justify-between">
                      <div className="h-2 w-32 bg-neutral-300" />
                      <div className="h-2 w-16 bg-neutral-400" />
                    </div>
                  ))}
                </div>
                
                {/* Total */}
                <div className="border-t-2 border-dashed border-black pt-4 flex justify-between items-center">
                  <span className="font-bold uppercase tracking-wider text-sm">Total</span>
                  <span className="text-2xl font-bold tracking-tighter">$124.50</span>
                </div>

                {/* Decorative elements */}
                <div className="absolute -top-4 -right-4 h-8 w-8 bg-swiss-orange border border-black" />
                <div className="absolute -bottom-4 -left-4 h-12 w-12 bg-swiss-blue border border-black" />
              </div>

              {/* Floating stats card */}
              <motion.div 
                className="absolute -bottom-6 -left-6 bg-white border border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-swiss-green flex items-center justify-center">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">This Month</p>
                    <p className="text-xl font-bold tracking-tighter">$1,240.00</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 border-t border-black bg-neutral-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-4">
              Everything You Need
            </h2>
            <p className="text-neutral-600 max-w-md mx-auto">
              Built with Swiss precision. No clutter, no unnecessary features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Scan,
                title: "AI Scanning",
                description: "Upload a receipt photo and our AI extracts the store, amount, and date automatically.",
                color: "bg-swiss-blue"
              },
              {
                icon: Receipt,
                title: "Digital Archive",
                description: "All your receipts organized in one place. Search, filter, and access anytime.",
                color: "bg-black"
              },
              {
                icon: Shield,
                title: "Secure Storage",
                description: "Your data is encrypted and stored securely. Only you can access your receipts.",
                color: "bg-swiss-green"
              }
            ].map((feature, index) => (
              <motion.div 
                key={feature.title}
                className="group bg-white border border-black p-8 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-[3px] hover:-translate-y-[3px] transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <div className={`h-12 w-12 ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold tracking-tight mb-3">{feature.title}</h3>
                <p className="text-neutral-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-black">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tighter mb-12 text-center">
            How It Works
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                title: "Upload",
                description: "Take a photo or upload an image of your receipt."
              },
              {
                step: "02",
                title: "Scan",
                description: "AI automatically extracts the important details."
              },
              {
                step: "03",
                title: "Track",
                description: "View reports, track spending, and stay organized."
              }
            ].map((item, index) => (
              <motion.div 
                key={item.step}
                className="relative"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.15 }}
              >
                <span className="text-6xl font-bold tracking-tighter text-neutral-200">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold tracking-tight mt-4 mb-2">{item.title}</h3>
                <p className="text-neutral-600">{item.description}</p>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 right-0 w-24 h-px bg-black" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 border-t border-black bg-black text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6">
            Ready to get organized?
          </h2>
          <p className="text-lg text-neutral-400 mb-8 max-w-md mx-auto">
            Join thousands of users who simplified their expense tracking.
          </p>
          <Link 
            href="/register"
            className="group inline-flex items-center gap-2 px-8 py-4 bg-white text-black font-bold uppercase tracking-wider hover:bg-neutral-200 transition-all"
          >
            Get Started Free
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <p className="mt-4 text-sm text-neutral-500">No credit card required</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-black">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm font-bold tracking-tighter">
            Daticket
          </p>
          <p className="text-sm text-neutral-500">
            Built with Swiss precision
          </p>
          <div className="flex gap-6">
            <Link href="/login" className="text-sm text-neutral-600 hover:text-black transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="text-sm text-neutral-600 hover:text-black transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
