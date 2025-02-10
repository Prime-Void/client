export interface ProgressEvent {
  loaded: number;
  total: number;
  percent: number;
}

export type ProgressCallback = (event: ProgressEvent) => void;

export interface ProgressConfig {
  onUploadProgress?: ProgressCallback;
  onDownloadProgress?: ProgressCallback;
}
