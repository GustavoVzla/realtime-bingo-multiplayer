# 🎮 Guía de Prueba - Bingo Online

## ✅ Configuración Completada

El proyecto está listo para probar **SIN necesidad de Supabase**. Se ha configurado un modo DEMO que simula la base de datos.

---

## 🚀 Cómo Probar el Juego

### 1. Iniciar los Servidores

En la terminal, ejecuta:

```bash
cd bingo_online
pnpm dev
```

Esto iniciará:

- **Backend** en http://localhost:3000 (con Socket.IO)
- **Frontend** en http://localhost:5173 (interfaz de prueba)

### 2. Abrir la Interfaz de Prueba

Abre tu navegador en: **http://localhost:5173**

Verás una interfaz con:

- Estado de conexión (verde = conectado)
- Controles para crear/unirse a salas
- Visualización de tarjetas de bingo
- Botones para sortear bolas

---

## 🎯 Flujo de Prueba

### Opción A: Un Solo Jugador (Prueba Rápida)

1. **Crear Sala:**
   - Click en "Create New Room"
   - Se creará automáticamente una sala con ID único

2. **Iniciar Juego:**
   - Click en "Start Game"
   - El estado cambiará a "PLAYING"

3. **Sortear Bolas:**
   - Click en "Draw Ball" repetidamente
   - Verás las bolas aparecer en la parte superior
   - Los números sorteados se iluminan en azul en la tarjeta

4. **Marcar Números:**
   - Click en los números sorteados para marcarlos (verde)
   - El espacio "FREE" está siempre marcado

5. **Observar Patrones:**
   - Intenta completar una línea horizontal
   - Cuando completes el patrón, ¡BINGO!

### Opción B: Multijugador (Prueba Completa)

1. **Abrir Dos Ventanas del Navegador:**
   - Ventana 1: http://localhost:5173
   - Ventana 2: http://localhost:5173

2. **Ventana 1 - Crear y Unirse:**
   - Click "Create New Room"
   - Copia el Room ID (ej: "abc123...")
   - Ingresa tu nombre: "Jugador 1"
   - Click "Join Room"

3. **Ventana 2 - Unirse:**
   - Pega el Room ID copiado
   - Ingresa tu nombre: "Jugador 2"
   - Click "Join Room"

4. **Iniciar Juego (Ventana 1):**
   - Click "Start Game"
   - Ambas ventanas verán el cambio de estado

5. **Sortear Bolas:**
   - En cualquier ventana, click "Draw Ball"
   - Ambos jugadores verán las mismas bolas
   - Cada uno puede marcar su propia tarjeta

6. **Competir:**
   - El primero en completar el patrón gana
   - Observa cómo las tarjetas de ambos jugadores se actualizan en tiempo real

---

## 🎲 Patrones de Bingo Disponibles

1. **HORIZONTAL** - Cualquier línea horizontal completa
2. **VERTICAL** - Cualquier línea vertical completa
3. **DIAGONAL** - Cualquiera de las dos diagonales
4. **L** - Forma de L (columna izquierda + fila inferior)
5. **M** - Forma de M
6. **O** - Marco exterior completo
7. **X** - Ambas diagonales
8. **FOUR_CORNERS** - Las 4 esquinas
9. **FULL_CARD** - Toda la tarjeta completa

---

## 🔍 Qué Observar Durante la Prueba

### Backend (Terminal)

```
⚠️  Running in DEMO MODE - Supabase disabled (using mock client)
ℹ️  To enable Supabase: Add real credentials to apps/backend/.env
🚀 Server running on port 3000
📡 Socket.IO ready for connections
🌍 Environment: development
```

### Frontend (Navegador)

- **Estado de Conexión:** Debe mostrar "✅ Connected to server"
- **Socket ID:** Debe mostrar un ID único (ej: "xyz789...")
- **Room ID:** Al crear sala, debe generar un ID único
- **Bolas Sorteadas:** Deben aparecer en tiempo real
- **Tarjetas:** Los números deben iluminarse automáticamente

### Consola del Navegador (F12)

```
✅ Connected to server: xyz789...
Room created: { id: "...", players: [], ... }
Ball called: 23
Ball called: 45
```

---

## 🐛 Solución de Problemas

### "Disconnected from server"

**Solución:** Verifica que el backend esté corriendo en el puerto 3000

```bash
# En otra terminal:
curl http://localhost:3000/health
# Debe responder: {"status":"ok","timestamp":"..."}
```

### No se sortean bolas

**Solución:** Asegúrate de que:

1. El juego esté en estado "PLAYING" (no "WAITING")
2. Hayas clickeado "Start Game" primero
3. Haya bolas disponibles (máximo 75 bolas por juego)

### No puedo marcar números

**Solución:**

- Solo puedes marcar números que YA han sido sorteados
- Los números sorteados aparecen con fondo azul claro
- Click en el número para marcarlo en verde

### La sala no aparece en la segunda ventana

**Solución:**

- Verifica que copiaste el Room ID completo
- Asegúrate de que ambas ventanas estén conectadas (indicador verde)

---

## 📊 Características de la Interfaz de Prueba

### Panel Superior - Estado

- **Conexión:** Verde = conectado, Rojo = desconectado
- **Socket ID:** Identificador único de tu conexión
- **Room ID:** Identificador de la sala actual
- **Status:** waiting / playing / paused / ended

### Panel de Controles

- **Create New Room:** Crea una sala nueva con configuración por defecto
- **Join Room:** Únete a una sala existente usando su ID
- **Start Game:** Inicia el juego (solo disponible en estado "waiting")
- **Draw Ball:** Sortea una bola (solo disponible en estado "playing")
- **Leave Room:** Sale de la sala actual

### Visualización de Bolas

- **Bola Actual:** Grande, circular, con el número destacado
- **Historial:** Todas las bolas sorteadas en orden
- **Contador:** Cantidad total de bolas sorteadas

### Tarjetas de Bingo

- **Encabezado B-I-N-G-O:** Azul, indica columnas
- **FREE:** Centro, siempre marcado en amarillo
- **No Sorteadas:** Gris claro
- **Sorteadas:** Azul claro (disponibles para marcar)
- **Marcadas:** Verde (por el jugador)

---

## 🎨 Colores y Estados

| Estado     | Color     | Significado                   |
| ---------- | --------- | ----------------------------- |
| Gris claro | `#F9FAFB` | Número no sorteado aún        |
| Azul claro | `#DBEAFE` | Número sorteado (disponible)  |
| Verde      | `#10B981` | Número marcado por el jugador |
| Amarillo   | `#FBBF24` | Espacio FREE (centro)         |
| Rojo       | Texto     | Botón "Leave Room"            |
| Verde      | Botón     | "Start Game" / "Join Room"    |
| Azul       | Botón     | "Draw Ball" / "Create Room"   |

---

## 🔧 Configuración Avanzada

### Cambiar el Patrón de Juego

Edita `apps/frontend/src/components/GameTest.tsx` línea ~85:

```tsx
socket.emit(GameEvent.CREATE_ROOM, {
  sessionId: 'test-session-' + Date.now(),
  maxPlayers: 4,
  pattern: BingoPattern.DIAGONAL, // Cambia aquí
});
```

Opciones: `HORIZONTAL`, `VERTICAL`, `DIAGONAL`, `L_SHAPE`, `FOUR_CORNERS`, etc.

### Cambiar Cantidad de Jugadores

En el mismo archivo, cambia `maxPlayers: 4` a la cantidad deseada.

### Personalizar Tarjetas

Edita la función `joinRoom()` para generar tarjetas con números específicos.

---

## ✅ Checklist de Prueba

- [ ] Backend inicia sin errores
- [ ] Frontend carga en http://localhost:5173
- [ ] Estado de conexión muestra "Connected"
- [ ] Se puede crear una sala
- [ ] Se puede unir a una sala existente
- [ ] Se puede iniciar el juego
- [ ] Se sortean bolas correctamente
- [ ] Las bolas aparecen en tiempo real
- [ ] Se pueden marcar números en la tarjeta
- [ ] Los números sorteados se iluminan automáticamente
- [ ] Múltiples ventanas se sincronizan correctamente
- [ ] El estado del juego se actualiza en todas las ventanas

---

## 📹 Video de Prueba Sugerido

1. Abre OBS o grabador de pantalla
2. Graba el siguiente flujo:
   - Crear sala
   - Abrir segunda ventana
   - Unir ambos jugadores
   - Iniciar juego
   - Sortear 10-15 bolas
   - Mostrar marcado en ambas tarjetas
   - Completar un patrón

---

## 🎯 Próximos Pasos

Una vez probado el juego básico:

1. **Agregar Supabase:**
   - Crear proyecto en https://supabase.com
   - Actualizar credenciales en `.env`
   - Ejecutar migración de base de datos

2. **Implementar Funciones Completas:**
   - Verificación de BINGO automática
   - Sistema de premios
   - Autenticación de usuarios
   - Pagos (5 métodos)

3. **Mejorar UI:**
   - Animaciones de bolas cayendo
   - Efectos sonoros
   - Confeti al ganar
   - Estadísticas de jugadores

---

**¡Disfruta probando el juego! 🎉**
