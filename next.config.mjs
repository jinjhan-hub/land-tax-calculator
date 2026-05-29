/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    outputFileTracingIncludes: {
      "/api/land-tax/pdf": [
        "./public/templates/land-tax/pacific-v1.pdf",
        "./assets/fonts/NotoSansTC-Regular.ttf",
      ],
      "/api/land-tax/pdf/download": [
        "./public/templates/land-tax/pacific-v1.pdf",
        "./assets/fonts/NotoSansTC-Regular.ttf",
      ],
    },
  },
};

export default nextConfig;
