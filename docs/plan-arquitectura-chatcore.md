# Plan maestro de arquitectura para ChatCore

## 1) Diagnóstico inicial del repositorio (estado actual)

- El repositorio actualmente contiene una base mínima (`README.md`) sin una implementación técnica del producto (sin código de backend/frontend, sin CI/CD, sin infraestructura declarativa, sin pruebas automatizadas).
- Antes de optimizar código, primero debemos definir la arquitectura objetivo y el plan de ejecución por fases.

## 2) Objetivos del proyecto

1. Construir una plataforma de chat robusta (inicialmente enfocada en WhatsApp + canal web).
2. Separar claramente backend y frontend para escalabilidad y mantenibilidad.
3. Implementar una base sólida de observabilidad, seguridad y calidad.
4. Reducir riesgos de crecimiento (concurrencia, latencia, consistencia, costos).

## 3) Propuesta de stack tecnológico (recomendado)

> Nota: alternativa pensada para time-to-market + escalabilidad + facilidad de contratación.

### Backend
- **Runtime/API:** Node.js + TypeScript
- **Framework:** NestJS (modular, testable, opinionado para equipos)
- **API principal:** REST para operaciones administrativas + WebSocket para tiempo real
- **Mensajería/eventos:** Redis Streams o RabbitMQ (event-driven para colas de envío/recepción)
- **Base de datos transaccional:** PostgreSQL
- **Cache/sesiones/presencia:** Redis
- **ORM:** Prisma
- **Validación y contrato:** Zod o class-validator + OpenAPI
- **Autenticación:** JWT + refresh tokens + RBAC

### Frontend
- **Framework:** Next.js (React + TypeScript)
- **UI:** Tailwind CSS + sistema de componentes reusable
- **Estado remoto:** TanStack Query
- **Estado local complejo (si aplica):** Zustand
- **Tiempo real:** Socket.IO client (o WebSocket nativo con capa adaptadora)

### Infraestructura / DevOps
- **Contenedores:** Docker + docker-compose para local
- **Orquestación (futuro):** Kubernetes o ECS
- **CI/CD:** GitHub Actions
- **IaC:** Terraform (si se despliega en nube)
- **Observabilidad:** OpenTelemetry + Prometheus + Grafana + Sentry
- **Feature flags:** Unleash / LaunchDarkly (según presupuesto)

## 4) Separación backend y frontend (estructura sugerida)

### Opción recomendada: monorepo

```
/chatcore
  /apps
    /backend-api
    /frontend-web
    /worker-messaging
  /packages
    /shared-types
    /eslint-config
    /tsconfig
    /ui
  /infra
    /docker
    /terraform
  /docs
```

### Beneficios
- Reutilización de tipos (`shared-types`) entre frontend y backend.
- Versionado consistente de cambios cross-cutting.
- Pipeline CI más simple y homogéneo.

## 5) Diseño funcional por dominios

### Dominios de backend
1. **Auth & Users**
2. **Conversations**
3. **Messages**
4. **Contacts**
5. **Channels/Integrations** (WhatsApp, Web, futuras integraciones)
6. **Templates/Bot Flows**
7. **Analytics & Reporting**
8. **Admin/Configuration**

### Principios de diseño
- Arquitectura modular (hexagonal/light DDD).
- Casos de uso desacoplados de infraestructura.
- Event-driven para operaciones de alta concurrencia (envío de mensajes, webhooks).

## 6) Riesgos típicos en plataformas de chat y mitigaciones

1. **Duplicación de mensajes**  
   Mitigar con idempotency keys + deduplicación por `external_message_id`.

2. **Desorden temporal de eventos**  
   Mitigar con secuencias por conversación + timestamps de origen y procesamiento.

3. **Picos de tráfico y throttling de proveedores**  
   Mitigar con colas, backoff exponencial y circuit breaker.

4. **Inconsistencia entre canales**  
   Mitigar con capa de normalización de eventos por canal.

5. **Problemas de auditoría/compliance**  
   Mitigar con trazabilidad completa (actor, acción, timestamp, payload hash).

## 7) Plan de implementación por fases

### Fase 0 — Descubrimiento y arquitectura (1 semana)
- Levantamiento de requerimientos funcionales/no funcionales.
- Definición de SLAs (latencia, disponibilidad, durabilidad).
- Diagramas C4 (Context, Container, Component).
- Definición de contratos API y eventos.

### Fase 1 — Fundaciones técnicas (1-2 semanas)
- Bootstrapping monorepo.
- Setup linting, formatting, testing base.
- Pipeline CI (lint + test + build).
- Entorno local con Docker Compose (PostgreSQL + Redis).

### Fase 2 — MVP conversacional (2-4 semanas)
- Autenticación + RBAC.
- CRUD de conversaciones/contactos.
- Mensajería en tiempo real web (socket).
- Persistencia de mensajes y estados (sent, delivered, read).

### Fase 3 — Integración WhatsApp + robustez (2-3 semanas)
- Webhooks entrantes/salientes.
- Worker de colas para envío.
- Retries idempotentes.
- Monitor de errores y métricas.

### Fase 4 — Operación y escalado (continuo)
- Dashboards operativos.
- Alertas SLO.
- Pruebas de carga.
- Hardening de seguridad.

## 8) Checklist de mejoras/optimizaciones a ejecutar

### Backend
- [ ] Definir bounded contexts y contratos.
- [ ] Implementar patrón repository/service/use-case.
- [ ] Asegurar cobertura de pruebas de dominio y contratos.
- [ ] Implementar retries, timeouts y circuit breakers.
- [ ] Agregar auditoría y trazabilidad por evento.

### Frontend
- [ ] Diseñar design system base.
- [ ] Normalizar manejo de errores y estados vacíos.
- [ ] Implementar virtualización para listas largas de mensajes.
- [ ] Estrategia de reconexión y sincronización socket.

### Plataforma
- [ ] CI/CD con quality gates.
- [ ] Escaneo de seguridad (SAST + dependencias).
- [ ] Logging estructurado con correlación por request/conversation.
- [ ] Políticas de backup y disaster recovery.

## 9) KPIs técnicos sugeridos

- P95 latencia de envío/recepción.
- Tasa de errores por canal.
- Duplicación de mensajes (%).
- Tiempo de sincronización cliente-servidor.
- Disponibilidad mensual.
- MTTR de incidentes.

## 10) Próximo paso inmediato (acción concreta)

1. Acordar stack definitivo (esta semana).
2. Crear estructura monorepo base con apps backend/frontend.
3. Diseñar esquema inicial de datos (usuarios, conversaciones, mensajes, eventos).
4. Implementar MVP con pruebas y observabilidad desde el día 1.
