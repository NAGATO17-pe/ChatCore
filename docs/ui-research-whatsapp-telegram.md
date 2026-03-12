# Investigación y conclusión de UI: WhatsApp + Telegram (referencia)

## Alcance
Este análisis se enfoca en patrones visibles de interfaz (UX/UI) de WhatsApp Web y Telegram Desktop/Web para construir un diseño híbrido moderno en ChatCore.

## Hallazgos clave

### 1) ¿Con qué librería están hechos?
- No existe confirmación pública simple y única de "una sola librería" para ambos productos en todas sus plataformas.
- Ambos productos usan implementaciones propietarias y evolución continua.
- **Conclusión práctica de arquitectura UI:** no debemos copiar una librería específica, sino replicar los **patrones de interacción** que hacen fuerte su experiencia de chat.

### 2) Patrones visuales de WhatsApp
- Layout de dos paneles: lista de chats a la izquierda y conversación a la derecha.
- Mensajes en burbujas con fuerte legibilidad y espaciado consistente.
- Estado visual claro en chat seleccionado.
- Header de conversación con acciones rápidas.
- Composer inferior simple, directo y eficiente.

### 3) Patrones visuales de Telegram
- Mayor limpieza visual y amplitud de espacios.
- Jerarquía tipográfica más marcada y superficies más "aireadas".
- Mejor separación de estados (hover/active/selected).
- Sensación "premium" por uso de sombras suaves y transiciones sutiles.

## Decisión de diseño para ChatCore
Aplicar un híbrido:
1. **Estructura funcional tipo WhatsApp** (dos paneles + flujo mental familiar).
2. **Acabado visual tipo Telegram** (limpio, moderno, más premium).
3. Paleta basada en verde profundo/teal con neutros claros para mantener identidad y contraste.
4. Componentes clave reforzados:
   - Sidebar con buscador y lista con estados claros.
   - Header de chat más robusto.
   - Burbujas entrante/saliente diferenciadas.
   - Composer minimalista y dominante.

## Resultado esperado
Una interfaz reconocible e intuitiva (aprendizaje inmediato), pero con estética moderna de producto SaaS listo para escalar.
