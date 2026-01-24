import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [{ url: "/~offline", revision: Date.now().toString() }],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
};

export default withSerwist(nextConfig);
