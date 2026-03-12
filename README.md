# ChatCore (MVP local en red)

Chat básico en tiempo real para comunicarse entre dos o más PCs en la **misma red LAN**, sin complejidades de producción.

## Stack usado (simple)
- **Backend:** Node.js + Express + Socket.IO
- **Base de datos:** SQLite
- **ORM:** Prisma
- **Frontend:** HTML/CSS/JS simple servido por Express
- **Logging/monitoreo básico:** morgan + endpoint `/health`
- **Testing:** Vitest (unit tests básicos)

## Requisitos
- Node.js 20+

## Arranque rápido
1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Configurar variables:
   ```bash
   cp .env.example .env
   ```
3. Crear base de datos local:
   ```bash
   npm run db:push
   ```
4. Ejecutar servidor:
   ```bash
   npm run dev
   ```
5. Abrir en navegador:
   - En la máquina host: `http://localhost:3000`
   - En otra PC de la red: `http://<IP_LOCAL_DEL_HOST>:3000`

## Flujo de uso
1. Escribir tu usuario (ej: `ana`).
2. Crear chat indicando nombre y participantes (separados por comas).
3. Seleccionar el chat.
4. Enviar mensajes en tiempo real.

## Scripts
- `npm run dev`: levanta app
- `npm run db:push`: crea/actualiza esquema SQLite
- `npm run test`: corre tests
- `npm run lint`: revisa calidad básica de código

## Siguiente evolución (cuando quieras escalar)
- Autenticación real
- Control de permisos por chat
- Historial paginado
- Frontend React/Next
- Redis + colas
