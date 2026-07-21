import type { NextConfig } from "next";

const generateAllowedOrigins = () => {
  const list = ["localhost", "127.0.0.1"];
  
  // Generar rangos de subredes locales más comunes
  // 192.168.0.x, 192.168.1.x, 192.168.2.x, 192.168.8.x, 192.168.100.x, 192.168.250.x
  const subnets = [0, 1, 2, 8, 100, 250]; 
  for (const s of subnets) {
    for (let i = 1; i <= 255; i++) {
      list.push(`192.168.${s}.${i}`);
    }
  }
  
  // Rango 10.0.0.x y 10.0.1.x
  for (const s of [0, 1]) {
    for (let i = 1; i <= 255; i++) {
      list.push(`10.0.${s}.${i}`);
    }
  }
  
  return list;
};

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: generateAllowedOrigins()
};

export default nextConfig;
