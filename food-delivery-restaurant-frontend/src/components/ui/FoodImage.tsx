import { useState, useEffect } from 'react';
import { Utensils } from 'lucide-react';
import { MenuItem } from '@/data/mockData';

const foodImages: Record<string, string> = {
  paneer: 'https://images.pexels.com/photos/247466/pexels-photo-247466.jpeg?auto=compress&cs=tinysrgb&w=400',
  biryani: 'https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg?auto=compress&cs=tinysrgb&w=400',
  pizza: 'https://images.pexels.com/photos/708587/pexels-photo-708587.jpeg?auto=compress&cs=tinysrgb&w=400',
  burger: 'https://images.pexels.com/photos/1639772/pexels-photo-1639772.jpeg?auto=compress&cs=tinysrgb&w=400',
  dosa: 'https://images.pexels.com/photos/8472897/pexels-photo-8472897.jpeg?auto=compress&cs=tinysrgb&w=400',
  tikka: 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg?auto=compress&cs=tinysrgb&w=400',
  salad: 'https://images.pexels.com/photos/1213710/pexels-photo-1213710.jpeg?auto=compress&cs=tinysrgb&w=400',
  pasta: 'https://images.pexels.com/photos/4518843/pexels-photo-4518843.jpeg?auto=compress&cs=tinysrgb&w=400',
  naan: 'https://images.pexels.com/photos/247466/pexels-photo-247466.jpeg?auto=compress&cs=tinysrgb&w=400',
  rolls: 'https://images.pexels.com/photos/1803555/pexels-photo-1803555.jpeg?auto=compress&cs=tinysrgb&w=400',
  fish: 'https://images.pexels.com/photos/425331/pexels-photo-425331.jpeg?auto=compress&cs=tinysrgb&w=400',
  brownie: 'https://images.pexels.com/photos/45202/brownie-dessert-cake-sweet-45202.jpeg?auto=compress&cs=tinysrgb&w=400',
  gulab: 'https://images.pexels.com/photos/13063667/pexels-photo-13063667.jpeg?auto=compress&cs=tinysrgb&w=400',
  coffee: 'https://images.pexels.com/photos/2074130/pexels-photo-2074130.jpeg?auto=compress&cs=tinysrgb&w=400',
  lime: 'https://images.pexels.com/photos/96974/pexels-photo-96974.jpeg?auto=compress&cs=tinysrgb&w=400',
  rice: 'https://images.pexels.com/photos/5409010/pexels-photo-5409010.jpeg?auto=compress&cs=tinysrgb&w=400',
};

export function FoodImage({ image = '', name, className = '' }: { image?: string | null; name: string; className?: string }) {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    setLoadFailed(false);
  }, [image]);

  const resolveUrl = (img?: string | null): string | null => {
    if (!img || img === 'placeholder') return null;
    if (img.startsWith('/') || img.startsWith('http')) return img;
    return foodImages[img] ?? null;
  };

  const initialUrl = resolveUrl(image);

  if (!initialUrl || loadFailed) {
    return (
      <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 flex flex-col items-center justify-center p-2 text-center text-gray-400 select-none ${className}`}>
        <Utensils className="w-5 h-5 mb-1 text-gray-400 dark:text-gray-500 stroke-[1.5]" />
        <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 line-clamp-1 leading-tight px-1">
          {name}
        </span>
        <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
          {initialUrl ? 'Image unavailable' : 'No photo'}
        </span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}>
      <img
        src={initialUrl}
        alt={name}
        loading="lazy"
        onError={() => setLoadFailed(true)}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
      />
    </div>
  );
}

export function getFoodImage(image: string): string {
  if (!image || image === 'placeholder') return foodImages.paneer;
  if (image.startsWith('/') || image.startsWith('http')) return image;
  return foodImages[image] ?? foodImages.paneer;
}

export function getMenuItemImage(item: MenuItem): string {
  return getFoodImage(item.image_url || item.image);
}
