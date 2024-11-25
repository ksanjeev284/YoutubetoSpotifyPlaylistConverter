import React from 'react';
import { Toaster } from 'react-hot-toast';
import { Header } from './components/Header';
import { PlaylistConverter } from './components/PlaylistConverter';
import { Features } from './components/Features';

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      <Header />
      
      <main>
        <section className="py-16 bg-gradient-to-b from-indigo-600 to-purple-700 text-white">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Convert YouTube Playlists to Spotify
            </h1>
            <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
              Easily transfer your favorite YouTube music playlists to Spotify with just a few clicks.
              Fast, secure, and free!
            </p>
          </div>
        </section>

        <PlaylistConverter />
        <Features />
      </main>

      <footer className="bg-gray-800 text-gray-300 py-8">
        <div className="container mx-auto px-4 text-center">
          <p>© {new Date().getFullYear()} PlaylistPort. All rights reserved.</p>
          <p className="text-sm mt-2">
            Not affiliated with YouTube or Spotify. All trademarks belong to their respective owners.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;