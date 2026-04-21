import React from 'react';

type PublicPageHeroProps = {
  eyebrow: string;
  title: React.ReactNode;
  description: React.ReactNode;
  sectionClassName?: string;
  contentClassName?: string;
};

export const PublicPageHero: React.FC<PublicPageHeroProps> = ({
  eyebrow,
  title,
  description,
  sectionClassName = '',
  contentClassName = 'max-w-[740px]',
}) => {
  return (
    <section className={`relative w-screen left-[50%] right-[50%] ml-[-50vw] mr-[-50vw] h-[260px] sm:h-[300px] lg:h-[350px] overflow-hidden ${sectionClassName}`.trim()}>
      <div className="absolute inset-0 bg-[linear-gradient(116deg,#38BDF2_0%,#38BDF2_44%,#F2F2F2_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,62,134,0.45)_0%,rgba(0,62,134,0.2)_34%,rgba(0,62,134,0)_72%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_32%,rgba(255,255,255,0.34),transparent_46%),linear-gradient(90deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.06)_26%,rgba(255,255,255,0)_52%)]" />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-6xl items-center px-5 sm:px-8">
        <div className={contentClassName}>
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/90">{eyebrow}</p>
          <h1 className="text-[2.1rem] font-black leading-none tracking-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-[700px] text-base leading-relaxed text-white/95 sm:text-[1.1rem]">{description}</p>
        </div>
      </div>
    </section>
  );
};
