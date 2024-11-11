interface ImportMetaEnv {
  readonly VITE_GOOGLE_SCOPE: string;
  readonly VITE_GOOGLE_REDIRECT_URL: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_CLOUDINARY_CLOUD_NAME: string;
  readonly VITE_MAIL_SERVER_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_GOOGLE_CLIENT_SECRET: string;
  readonly VITE_BACKEND_IP: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}/// <reference types="vite/client" />
