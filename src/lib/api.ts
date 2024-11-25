import axios from 'axios';
import { ConversionResult, Track, YouTubePlaylist } from '../types';

const API_URL = import.meta.env.PROD ? '/.netlify/functions' : 'https://youtubetospotifyplaylistconverter.netlify.app/.netlify/functions/spotify-auth';

export async function fetchYouTubePlaylist(url: string): Promise<YouTubePlaylist> {
  const response = await axios.post(`${API_URL}/youtube-playlist`, { url });
  return response.data;
}

export async function startSpotifyAuth(): Promise<string> {
  const response = await axios.get(`${API_URL}/spotify-auth`);
  return response.data.authUrl;
}

export async function convertPlaylist(
  playlistId: string,
  spotifyToken: string
): Promise<ConversionResult> {
  const response = await axios.post(
    `${API_URL}/convert`,
    { playlistId },
    { headers: { Authorization: `Bearer ${spotifyToken}` } }
  );
  return response.data;
}