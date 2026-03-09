/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "base-ec2.akamaized.net", pathname: "/**" },
      { protocol: "https", hostname: "baseec-img-mng.akamaized.net", pathname: "/**" },
      { protocol: "https", hostname: "via.placeholder.com", pathname: "/**" },
      { protocol: "https", hostname: "profile.line-scdn.net", pathname: "/**" },
      { protocol: "https", hostname: "sprofile.line-scdn.net", pathname: "/**" },
    ],
  },
};

export default nextConfig;
