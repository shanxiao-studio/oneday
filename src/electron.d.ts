export {};

declare global {
  interface Window {
    onedayDesktop?: {
      platform: string;
      version: string;
    };
  }
}
