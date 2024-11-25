export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  trackCount: number;
}

export interface Track {
  title: string;
  artist: string;
  duration: number;
}

export interface ConversionResult {
  success: boolean;
  spotifyPlaylistUrl?: string;
  error?: string;
}