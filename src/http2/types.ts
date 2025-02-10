export interface Http2Config {
  maxConcurrentStreams?: number;
  initialWindowSize?: number;
  maxSessionMemory?: number;
  maxHeaderListSize?: number;
  enablePush?: boolean;
  paddingStrategy?: number;
}

export interface Http2StreamOptions {
  endStream?: boolean;
  exclusive?: boolean;
  parent?: number;
  weight?: number;
  waitForTrailers?: boolean;
}

export interface Http2Stats {
  activeStreams: number;
  peakConcurrentStreams: number;
  totalStreams: number;
  totalDataSent: number;
  totalDataReceived: number;
  sessionUptime: number;
}
