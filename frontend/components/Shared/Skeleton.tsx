
import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ 
  className = '', 
  variant = 'rect', 
  width, 
  height 
}) => {
  const baseStyles = "bg-[#2E2E2F]/10 animate-shimmer relative overflow-hidden";
  
  const variantStyles = {
    rect: "rounded-xl",
    circle: "rounded-full",
    text: "rounded-md h-4 w-3/4"
  };

  const style: React.CSSProperties = {
    width: width,
    height: height
  };

  return (
    <div 
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
      style={style}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-[#F2F2F2]/40 to-transparent" />
    </div>
  );
};

export const EventCardSkeleton: React.FC<{ layout?: 'vertical' | 'horizontal' }> = ({ layout = 'vertical' }) => {
  if (layout === 'horizontal') {
    return (
      <div className="bg-[#F2F2F2] border border-black/5 rounded-2xl p-4 flex flex-col sm:flex-row gap-6 shadow-sm w-full animate-in fade-in duration-500">
        {/* Image Area */}
        <div className="relative w-full sm:w-[280px] lg:w-[320px] h-[180px] rounded-xl overflow-hidden shrink-0">
          <Skeleton className="w-full h-full !rounded-none" />
          {/* Top Left Date Badge Placeholder */}
          <div className="absolute top-3 left-3 z-[1]">
             <Skeleton variant="rect" width={58} height={54} className="rounded-xl opacity-70" />
          </div>
        </div>
        
        {/* Content Area */}
        <div className="flex flex-col flex-1 py-1 gap-5">
          <div className="space-y-3">
             <Skeleton variant="text" width="85%" height={32} />
             <Skeleton variant="text" width="60%" height={24} />
             <Skeleton variant="text" width="40%" height={24} />
          </div>
          
          <div className="mt-auto flex items-center justify-between pt-6">
             <Skeleton variant="rect" width={110} height={32} className="rounded-full" />
             <div className="flex gap-2">
                <Skeleton variant="circle" width={38} height={38} />
                <Skeleton variant="circle" width={38} height={38} />
             </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F2F2F2] border border-black/5 rounded-[5px] overflow-hidden shadow-sm h-full flex flex-col animate-in fade-in duration-500">
      {/* Image Area with Date Overlay */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden">
        <Skeleton className="w-full h-full !rounded-none" />
        <div className="absolute top-3 left-3 z-[1]">
           <Skeleton variant="rect" width={54} height={50} className="rounded-md opacity-70" />
        </div>
      </div>
      
      <div className="p-5 flex-1 flex flex-col gap-4">
        {/* Title */}
        <Skeleton variant="text" width="90%" height={26} />
        
        {/* Separator style */}
        <div className="h-px bg-black/5 w-full my-1.5" />

        {/* Info Rows */}
        <div className="space-y-3.5">
          <div className="flex items-center gap-2.5">
            <Skeleton variant="rect" width={18} height={18} />
            <Skeleton variant="text" width="75%" height={18} />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton variant="rect" width={18} height={18} />
            <Skeleton variant="text" width="55%" height={18} />
          </div>
          <div className="flex items-center gap-2.5">
            <Skeleton variant="rect" width={18} height={18} />
            <Skeleton variant="text" width="50%" height={18} />
          </div>
        </div>

        {/* Footer Area */}
        <div className="mt-auto flex items-center justify-between pt-4">
          <Skeleton variant="rect" width={90} height={32} className="rounded-md" />
          <Skeleton variant="text" width={60} height={24} />
        </div>
      </div>
    </div>
  );
};

export const OrganizerCardSkeleton: React.FC = () => (
  <div className="w-[300px] sm:w-[360px] shrink-0 snap-center bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-2xl p-6 flex flex-col items-center text-center">
    <Skeleton variant="circle" width={80} height={80} className="mb-4" />
    <Skeleton variant="text" width="70%" height={24} className="mb-2" />
    <Skeleton variant="text" width="40%" className="mb-6" />
    
    <div className="grid grid-cols-2 gap-4 w-full mb-6">
      <Skeleton variant="rect" height={50} className="rounded-xl" />
      <Skeleton variant="rect" height={50} className="rounded-xl" />
    </div>
    
    <Skeleton variant="rect" width="100%" height={44} className="rounded-xl" />
  </div>
);

export const ProfileSkeleton: React.FC = () => (
  <div className="bg-[#F2F2F2] min-h-screen">
    {/* Cover Header */}
    <Skeleton variant="rect" width="100%" height={320} className="!rounded-none" />
    
    <div className="max-w-6xl mx-auto px-6 -mt-16">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        {/* Avatar */}
        <Skeleton variant="circle" width={160} height={160} className="border-4 border-[#F2F2F2] shadow-xl shrink-0" />
        
        <div className="flex-1 space-y-4 pt-16 md:pt-20">
          <Skeleton variant="text" width="60%" height={48} />
          <Skeleton variant="text" width="40%" height={24} />
          
          <div className="flex gap-4 mt-6">
            <Skeleton variant="rect" width={140} height={44} />
            <Skeleton variant="rect" width={140} height={44} />
          </div>
        </div>
      </div>
      
      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-16">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
          <EventCardSkeleton />
          <EventCardSkeleton />
        </div>
        <div className="space-y-6">
          <Skeleton variant="rect" width="100%" height={200} />
          <Skeleton variant="rect" width="100%" height={100} />
        </div>
      </div>
    </div>
  </div>
);

export const EventDetailsSkeleton: React.FC = () => (
  <div className="bg-[#F2F2F2] min-h-screen">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <Skeleton variant="rect" width="100%" height={480} className="rounded-3xl" />
          <Skeleton variant="text" width="90%" height={60} />
          <div className="flex gap-6">
            <Skeleton variant="text" width="60%" height={24} />
            <Skeleton variant="text" width="30%" height={24} />
          </div>
          <Skeleton variant="rect" width="100%" height={300} />
        </div>
        <div className="lg:col-span-4 lg:sticky lg:top-32 h-fit space-y-8">
          <Skeleton variant="rect" width="100%" height={400} className="rounded-3xl shadow-xl" />
          <Skeleton variant="rect" width="100%" height={150} className="rounded-3xl" />
        </div>
      </div>
    </div>
  </div>
);

export const PortalCardSkeleton: React.FC = () => (
  <div className="p-5 rounded-2xl border border-[#E0E0E0] bg-[#F2F2F2] flex items-center gap-4">
    <Skeleton variant="rect" width={48} height={48} className="rounded-xl shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton variant="text" width="40%" height={12} />
      <Skeleton variant="text" width="60%" height={24} />
      <Skeleton variant="text" width="80%" height={10} />
    </div>
  </div>
);

export const PortalSkeleton: React.FC = () => (
  <div className="space-y-12 max-w-6xl mx-auto pt-10 px-4 sm:px-6 lg:px-0">
    {/* Hero Section Skeleton */}
    <div className="rounded-xl p-10 md:p-14 bg-[#38BDF2]/10 border-2 border-[#38BDF2]/20 shadow-sm overflow-hidden relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10 relative z-10">
        <div className="max-w-2xl flex-1 space-y-6">
          <Skeleton variant="rect" width={48} height={48} className="rounded-xl bg-white/20" />
          <Skeleton variant="text" width="70%" height={40} className="bg-white/20" />
          <Skeleton variant="text" width="90%" height={20} className="bg-white/20" />
        </div>
        <div className="flex gap-10 shrink-0">
          <div className="text-center space-y-3">
            <Skeleton variant="text" width={60} height={48} className="bg-white/20 mx-auto" />
            <Skeleton variant="text" width={40} height={12} className="bg-white/20 mx-auto" />
          </div>
          <div className="text-center space-y-3">
            <Skeleton variant="text" width={60} height={48} className="bg-white/20 mx-auto" />
            <Skeleton variant="text" width={40} height={12} className="bg-white/20 mx-auto" />
          </div>
        </div>
      </div>
      {/* Decorative Shimmer Overlay to look consistent with brand colors */}
      <div className="absolute inset-0 bg-[#38BDF2] mix-blend-overlay opacity-30 pointer-events-none" />
    </div>

    {/* Stat Widgets Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <Skeleton variant="rect" width="100%" height={160} className="rounded-xl" />
      <Skeleton variant="rect" width="100%" height={160} className="rounded-xl" />
      <Skeleton variant="rect" width="100%" height={160} className="rounded-xl" />
    </div>

    {/* Content Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-xl border-2 border-[#2E2E2F]/5 p-8 space-y-6">
          <Skeleton variant="rect" width={56} height={56} className="rounded-xl" />
          <Skeleton variant="text" width="80%" height={32} />
          <Skeleton variant="text" width="100%" height={60} />
          <Skeleton variant="text" width="40%" height={16} />
        </div>
      ))}
    </div>
  </div>
);

