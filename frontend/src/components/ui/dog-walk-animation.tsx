import React from 'react';

type Props = {
  isWalking: boolean;
};

// DogWalkAnimationをfunction宣言で記述
function DogWalkAnimation({ isWalking }: Props) {
  const S3_BUCKET_URL = process.env.NEXT_PUBLIC_S3_BUCKET_URL;

  const videoSrc = isWalking
    ? `${S3_BUCKET_URL}/animations/walking-dog-2.mp4`
    : `${S3_BUCKET_URL}/animations/dog-idle.mp4`;

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      <video
        src={videoSrc}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-contain bg-white"
      />
    </div>
  );
}

export default DogWalkAnimation;
