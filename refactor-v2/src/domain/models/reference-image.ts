export interface ReferenceImageState {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  dataUrl: string;
  createdAt: string;
}

export interface WardrobeReferenceState {
  images: ReferenceImageState[];
}
