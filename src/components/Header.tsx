import React from 'react';
import { Music } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Music className="w-8 h-8" />
            <h1 className="text-2xl font-bold">PlaylistPort</h1>
          </div>
          <nav>
            <ul className="flex space-x-6">
              <li>
                <a href="#how-it-works" className="hover:text-purple-200 transition-colors">
                  How it Works
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-purple-200 transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  );
}