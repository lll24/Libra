FROM node:20-slim

WORKDIR /workspace

# Copiar archivos de dependencias y realizar la instalación
COPY package*.json ./
RUN npm install

# Copiar el código del proyecto
COPY . .

# Exponer puerto de desarrollo
EXPOSE 3000

# Ejecutar el servidor de Next.js en modo desarrollo
CMD ["npm", "run", "dev"]
