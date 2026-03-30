
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

export const EventCardSkeleton: React.FC = () => (
  <div className="bg-[#F2F2F2] border border-[#2E2E2F]/10 rounded-xl overflow-hidden shadow-sm h-full flex flex-col">
    {/* Image Area */}
    <Skeleton className="aspect-[16/9] w-full !rounded-none" />
    
    <div className="p-5 flex-1 flex flex-col gap-4">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton variant="text" width="90%" height={24} />
        <Skeleton variant="text" width="60%" height={24} />
      </div>

      {/* Info Rows */}
      <div className="space-y-3 mt-2">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" width={32} height={32} />
          <Skeleton variant="text" width="40%" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" width={32} height={32} />
          <Skeleton variant="text" width="70%" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" width={32} height={32} />
          <Skeleton variant="text" width="50%" />
        </div>
      </div>

      {/* Button/Price Area */}
      <div className="mt-auto pt-5 border-t border-black/5">
        <Skeleton variant="rect" width="100%" height={40} />
      </div>
    </div>
  </div>
);

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

