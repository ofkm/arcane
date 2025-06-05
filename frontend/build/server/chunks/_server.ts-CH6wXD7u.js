import { j as json } from './index-Ddp2AB5f.js';

const GET = async () => {
  try {
    const info = {
      version: "25.0.0",
      containers: 3,
      images: 12,
      os: "Linux",
      arch: "x86_64"
    };
    return json(info);
  } catch (error) {
    console.error("Error fetching Docker info:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch Docker info" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

export { GET };
//# sourceMappingURL=_server.ts-CH6wXD7u.js.map
