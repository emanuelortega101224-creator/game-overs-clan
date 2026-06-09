## Objetivo

Implementar 4 roles con permisos granulares administrables, flujo completo de eventos→grupos con auto-asignación, y un chat estilo WhatsApp pulido (manteniendo la paleta neón naranja/púrpura del clan) con notas de voz.

## 1. Roles y permisos granulares

**Roles** (enum `app_role`): `admin`, `lider`, `lider_interno`, `decano`, `member`.

**Tabla `role_permissions`** — el ADMIN marca/desmarca capacidades por rol desde el panel:
- `create_event`, `edit_event`, `delete_event`
- `create_group`, `edit_group`, `delete_group`, `moderate_chat`
- `assign_mvp`
- `view_member_contacts` (ver teléfono/ff_id ocultos)
- `manage_raffles`, `manage_stickers`, `edit_site_texts`

Función `public.has_permission(_user_id, _perm)` (SECURITY DEFINER) usada en RLS y UI. ADMIN siempre pasa todo.

Panel admin gana sección **"Permisos por rol"** con matriz de checkboxes + sección **"Asignar roles"** (buscar usuario, asignar/quitar rol). DECANO es título honorífico visible (badge dorado en perfil/ranking/chat) — por defecto sin permisos extra, pero el admin puede dárselos.

## 2. Flujo eventos → grupos

**Ya existe** `events`, `groups`, `group_members` con `enforce_group_capacity`. Refinamientos:

- **Crear evento** (gated por `create_event`): título, tipo (guerra/competencia/versus), fecha, descripción, imagen fondo.
- **Crear grupos del evento** (gated por `create_group`): nombre, cupo máximo. Botón "+ Grupo" en la página del evento.
- **Auto-asignación**: cualquier integrante autenticado ve los grupos del evento con barra de cupo (`3/4`) y botón **"Unirme"**. Click → insert en `group_members`; trigger existente bloquea si está lleno (toast "Grupo lleno"). Botón **"Salir del grupo"** si ya pertenece. Solo un grupo por evento por usuario (constraint `unique(event_id_via_group, user_id)` vía trigger).
- Al unirse → acceso al chat del grupo.

## 3. Chat estilo WhatsApp (paleta neón del clan)

Rediseño visual del chat existente (`_app/grupos.$id.tsx`) — mismo color del clan, pero con la **estructura/UX de WhatsApp**:

- **Burbujas**: propias alineadas derecha con gradiente naranja→púrpura sutil y "tail" (cola triangular); ajenas a la izquierda en superficie oscura con tail. Esquinas tipo WhatsApp (18px, una esquina recortada del lado de la cola).
- **Cabecera**: avatar del grupo + nombre + subtítulo "N miembros · evento" + acción (ver miembros).
- **Agrupación**: mensajes consecutivos del mismo autor se agrupan (nombre solo en el primero, sin tail intermedio, timestamp solo en el último). Separadores de fecha ("Hoy", "Ayer", "12 mar").
- **Estados**: timestamp + check ✓ enviado, ✓✓ leído (tabla `message_reads`).
- **Composer**: pill redondeado, botón emoji/sticker, input expandible, micro al estar vacío, enviar al escribir. Mantiene stickers existentes.
- **Notas de voz mejoradas**: ya funcionan; rediseño visual con waveform estática (barras), duración mm:ss, slider de progreso al reproducir, velocidad 1x/1.5x/2x.
- Animaciones suaves en aparición de mensajes (framer-motion).

## 4. Realtime y seguridad

- RLS de `messages`/`group_members` ya scoped a miembros; mantener.
- Realtime ya configurado vía canal `messages-${groupId}`.
- `message_reads (message_id, user_id, read_at)` para los doble-check.

## 5. Cambios técnicos

- **Migración**: enum amplía roles, nueva tabla `role_permissions(role, permission, allowed)` con seed por defecto, función `has_permission`, tabla `message_reads`, trigger "un grupo por evento".
- **Hook `use-permissions.ts`**: lee permisos del usuario actual (cacheado) → `can("create_event")`.
- **UI**: nuevas vistas/secciones en `_app/admin.tsx` (matriz permisos, asignación roles), botones de crear evento/grupo gated, lista de grupos con auto-join en `_app/eventos.$type.tsx` o nueva ruta `eventos/$id`, rediseño `_app/grupos.$id.tsx`.
- Badge DECANO (icono corona dorada) en avatar/nombre en chat, perfil, ranking, integrantes.

## Entregables

1. Migración SQL (roles, permisos, reads, trigger).
2. Hook permisos + helpers UI.
3. Panel admin: matriz permisos + gestor de roles.
4. Flujo crear evento → crear grupos → auto-join.
5. Rediseño chat WhatsApp-style con paleta del clan.
6. Notas de voz pulidas + indicadores leído.

¿Procedo con la migración primero y luego el resto en paralelo?