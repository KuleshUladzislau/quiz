export default function robots() {
  return {
    rules: {
      userAgent: "*",
      disallow: ["/results", "/questions"],
    },
  };
}
