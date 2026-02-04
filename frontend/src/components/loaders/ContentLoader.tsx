import React, { useEffect, useState } from 'react';
import Lottie from 'lottie-react';

const ContentLoader: React.FC = () => {
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    fetch('/animations/loading.json')
      .then(res => res.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error('Failed to load animation:', err));
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-80 z-20">
      <div className="w-48 h-48 flex items-center justify-center">
        {animationData ? (
          <Lottie
            animationData={animationData}
            loop={true}
            className="w-full h-full"
          />
        ) : (
          <div className="w-12 h-12 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        )}
      </div>
    </div>
  );
};

export default ContentLoader;
