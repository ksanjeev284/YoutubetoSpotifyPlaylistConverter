import React, { useState, useEffect } from 'react';
import { ArrowRight, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { YouTubePlaylist } from '../types';
import { fetchYouTubePlaylist, startSpotifyAuth, convertPlaylist } from '../lib/api';

export function PlaylistConverter() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<YouTubePlaylist | null>(null);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);

  useEffect(() => {
    // Handle Spotify OAuth callback
    const hash = window.location.hash;
    if (hash) {
      const token = new URLSearchParams(hash.substring(1)).get('access_token');
      if (token) {
        setSpotifyToken(token);
        window.location.hash = '';
        toast.success('Successfully connected to Spotify!');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    try {
      const playlistData = await fetchYouTubePlaylist(url);
      setPlaylist(playlistData);
    } catch (error) {
      toast.error('Failed to fetch playlist');
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!playlist) return;

    if (!spotifyToken) {
      try {
        const authUrl = await startSpotifyAuth();
        window.location.href = authUrl;
      } catch (error) {
        toast.error('Failed to start Spotify authentication');
      }
      return;
    }

    setLoading(true);
    try {
      const result = await convertPlaylist(playlist.id, spotifyToken);
      if (result.success && result.spotifyPlaylistUrl) {
        toast.success('Playlist converted successfully!');
        window.open(result.spotifyPlaylistUrl, '_blank');
      } else {
        throw new Error(result.error || 'Conversion failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to convert playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col space-y-2">
          <label htmlFor="playlist-url" className="text-sm font-medium text-gray-700">
            YouTube Playlist URL
          </label>
          <div className="flex space-x-2">
            <input
              type="url"
              id="playlist-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.youtube.com/playlist?list=..."
              className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </form>

      {playlist && (
        <div className="mt-8 p-4 bg-white rounded-lg shadow">
          <div className="flex items-start space-x-4">
            <img
              src={playlist.thumbnailUrl}
              alt={playlist.title}
              className="w-24 h-24 object-cover rounded"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{playlist.title}</h3>
              <p className="text-sm text-gray-600">{playlist.trackCount} tracks</p>
              <p className="text-sm text-gray-500 mt-1">{playlist.description}</p>
              <button
                onClick={handleConvert}
                disabled={loading}
                className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  'Convert to Spotify'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}