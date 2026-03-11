import React from 'react';
import { Link } from 'react-router-dom';
import { ICONS } from '../../constants';

const values = [
  {
    title: 'We believe in the power of live experiences',
    description: 'In-person gatherings create connections that virtual events simply cannot replicate. We\'re committed to helping organizers bring people together safely and effectively.',
    icon: '🎯',
  },
  {
    title: 'We put organizers first',
    description: 'Every feature we build starts with understanding the challenges event organizers face. We design solutions that save time, reduce stress, and maximize impact.',
    icon: '💡',
  },
  {
    title: 'We\'re committed to transparency',
    description: 'Clear pricing, honest policies, and open communication. No hidden fees, no surprise charges—just straightforward tools that work for your budget.',
    icon: '🤝',
  },
  {
    title: 'We support communities of all sizes',
    description: 'From intimate workshops to large-scale conferences, our platform scales with your needs. Whether you\'re hosting 10 or 10,000 attendees, we\'ve got you covered.',
    icon: '🌍',
  },
];

const timeline = [
  {
    year: '2024',
    title: 'Platform Launch',
    description: 'StartupLab Business Ticketing launched with core event creation and ticketing features.',
  },
  {
    year: '2024',
    title: 'Payment Integration',
    description: 'Integrated HitPay for seamless payment processing across the Philippines.',
  },
  {
    year: '2025',
    title: 'Subscription Plans',
    description: 'Introduced professional and enterprise subscription plans for growing organizers.',
  },
  {
    year: '2025',
    title: 'Advanced Analytics',
    description: 'Launched comprehensive analytics dashboard for data-driven event decisions.',
  },
];

const team = [
  {
    name: 'StartupLab Team',
    role: 'Founders & Engineers',
    description: 'Passionate about building tools that empower event organizers.',
  },
];

export const AboutUsPage: React.FC = () => {
  return (
    <div className="bg-[#F2F2F2]">
      {/* Hero Section */}
      <section className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 h-[320px] sm:h-[380px] lg:h-[420px] overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#0F172A_0%,#1E3A5F_50%,#38BDF8_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.3),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(15,23,42,0.5),transparent_50%)]" />
        
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center px-5 sm:px-8">
          <div className="max-w-[800px]">
            <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-sky-300 mb-4 animate-fade-in">About StartupLab</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-6">
              Bringing People Together Through{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-300 to-white">Meaningful Events</span>
            </h1>
            <p className="text-lg sm:text-xl text-slate-200 leading-relaxed max-w-[700px]">
              We believe in the power of live experiences to create lasting connections, foster community, and drive real business impact.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12 sm:py-16 space-y-16">

        {/* Mission Statement */}
        <section className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-[#2E2E2F] mb-6">Our Mission</h2>
          <p className="text-lg text-[#2E2E2F]/70 leading-relaxed">
            We're on a mission to make event creation and management accessible, affordable, and enjoyable for organizers everywhere. 
            Whether you're hosting a small workshop, a community meetup, or a large-scale conference, StartupLab gives you 
            the tools you need to create memorable experiences.
          </p>
        </section>

        {/* Values Section */}
        <section>
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#38BDF8] mb-2">What We Believe</p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#2E2E2F]">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {values.map((value, index) => (
              <article 
                key={value.title} 
                className="rounded-2xl border border-[#2E2E2F]/10 bg-white p-6 sm:p-8 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="text-4xl mb-4">{value.icon}</div>
                <h3 className="text-lg font-black text-[#2E2E2F] mb-3">{value.title}</h3>
                <p className="text-sm text-[#2E2E2F]/65 leading-relaxed">{value.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Timeline Section */}
        <section className="rounded-[1.6rem] border border-[#2E2E2F]/10 bg-white p-6 sm:p-10">
          <div className="text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#38BDF8] mb-2">Our Journey</p>
            <h2 className="text-2xl sm:text-3xl font-black text-[#2E2E2F]">How We Started</h2>
          </div>
          
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#38BDF8] to-[#2E2E2F]/20" />
            
            <div className="space-y-8">
              {timeline.map((item, index) => (
                <div 
                  key={item.year} 
                  className={`relative flex items-center ${index % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'}`}
                >
                  {/* Dot */}
                  <div className="absolute left-4 sm:left-1/2 w-3 h-3 rounded-full bg-[#38BDF8] border-4 border-white shadow-lg -translate-x-1/2 z-10" />
                  
                  {/* Content */}
                  <div className={`ml-12 sm:ml-0 sm:w-[45%] ${index % 2 === 0 ? 'sm:pr-8 sm:text-right' : 'sm:pl-8'}`}>
                    <span className="inline-block px-3 py-1 rounded-full bg-[#38BDF8]/10 text-[#38BDF8] text-xs font-bold uppercase tracking-wider mb-2">
                      {item.year}
                    </span>
                    <h3 className="text-lg font-black text-[#2E2E2F] mb-1">{item.title}</h3>
                    <p className="text-sm text-[#2E2E2F]/60">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="rounded-[1.6rem] border border-[#2E2E2F]/10 bg-gradient-to-br from-[#0F172A] to-[#1E3A5F] p-6 sm:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Our Impact</h2>
            <p className="text-slate-300">Events powered by StartupLab</p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-6 text-center">
              <p className="text-3xl sm:text-4xl font-black text-[#38BDF8]">2,400+</p>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">Events Hosted</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-6 text-center">
              <p className="text-3xl sm:text-4xl font-black text-[#38BDF8]">120K+</p>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">Attendees Served</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-6 text-center">
              <p className="text-3xl sm:text-4xl font-black text-[#38BDF8]">900+</p>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">Organizer Teams</p>
            </div>
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm px-4 py-6 text-center">
              <p className="text-3xl sm:text-4xl font-black text-[#38BDF8]">1.1M+</p>
              <p className="text-xs sm:text-sm text-slate-300 mt-2 font-medium">Check-ins Processed</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-black text-[#2E2E2F] mb-4">
            Ready to Create Your Event?
          </h2>
          <p className="text-[#2E2E2F]/65 mb-8">
            Join thousands of organizers who trust StartupLab to power their events.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl bg-[#38BDF8] text-white font-bold text-sm uppercase tracking-wider hover:bg-[#0EA5E9] transition-colors shadow-lg shadow-[#38BDF8]/25"
            >
              Get Started Free
              <ICONS.ArrowRight className="w-4 h-4 ml-2" />
            </Link>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center px-8 py-4 rounded-2xl border-2 border-[#2E2E2F]/10 text-[#2E2E2F] font-bold text-sm uppercase tracking-wider hover:border-[#38BDF8]/30 hover:bg-[#38BDF8]/5 transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </section>

        {/* Contact Section */}
        <section className="rounded-[1.6rem] border border-[#2E2E2F]/10 bg-white p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-2xl font-black text-[#2E2E2F] mb-4">Get in Touch</h2>
              <p className="text-[#2E2E2F]/65 mb-6">
                Have questions about our platform? We'd love to hear from you. Our team is here to help you succeed.
              </p>
              <div className="space-y-3">
                <a 
                  href="mailto:hello@startuplab.ph" 
                  className="flex items-center gap-3 text-[#2E2E2F]/80 hover:text-[#38BDF8] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/10 flex items-center justify-center">
                    <ICONS.Mail className="w-5 h-5 text-[#38BDF8]" />
                  </div>
                  <span className="font-medium">hello@startuplab.ph</span>
                </a>
                <Link 
                  to="/contact" 
                  className="flex items-center gap-3 text-[#2E2E2F]/80 hover:text-[#38BDF8] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#38BDF8]/10 flex items-center justify-center">
                    <ICONS.MessageCircle className="w-5 h-5 text-[#38BDF8]" />
                  </div>
                  <span className="font-medium">Contact Support</span>
                </Link>
              </div>
            </div>
            <div className="flex justify-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#38BDF8] to-[#0EA5E9] flex items-center justify-center shadow-xl shadow-[#38BDF8]/20">
                <span className="text-5xl">🎉</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
