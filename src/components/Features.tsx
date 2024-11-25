import React from 'react';
import { Music2, Share2, Shield } from 'lucide-react';

export function Features() {
  const features = [
    {
      icon: <Music2 className="w-6 h-6" />,
      title: 'Smart Matching',
      description: 'Advanced algorithms to find the best matches for your songs on Spotify'
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure & Private',
      description: 'Your data is handled securely and we never store your playlist information'
    },
    {
      icon: <Share2 className="w-6 h-6" />,
      title: 'Easy Sharing',
      description: 'Share your converted playlists instantly with friends and family'
    }
  ];

  return (
    <section className="py-12 bg-gray-50" id="how-it-works">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}