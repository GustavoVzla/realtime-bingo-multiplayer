# Configuración de Redis para Bingo Online

## 🎯 ¿Qué opción de Redis debo usar?

### Comparación Rápida

| Característica                   | Upstash (Cloud) ⭐  | Docker (Local)         | Memurai (Windows)    |
| -------------------------------- | ------------------- | ---------------------- | -------------------- |
| **Requiere instalación**         | ❌ No               | ✅ Sí (Docker Desktop) | ✅ Sí (MSI + Admin)  |
| **Permisos de admin**            | ❌ No               | ⚠️ Depende del SO      | ✅ Sí (obligatorio)  |
| **Funciona sin internet**        | ❌ No               | ✅ Sí                  | ✅ Sí                |
| **Portabilidad (Win/Mac/Linux)** | ✅ Idéntico         | ✅ Idéntico            | ❌ Solo Windows      |
| **Desarrollo = Producción**      | ✅ Misma config     | ⚠️ Diferente en prod   | ❌ Diferente en prod |
| **Plan gratuito**                | ✅ 10K comandos/día | ✅ Ilimitado local     | ⚠️ Limitado (dev)    |
| **Tiempo de setup**              | ⏱️ 2-3 minutos      | ⏱️ 1 minuto            | ⏱️ 5-10 minutos      |
| **Backups automáticos**          | ✅ Incluidos        | ❌ Manual              | ❌ Manual            |
| **Dashboard web**                | ✅ Incluido         | ❌ No                  | ❌ No                |

### 🏆 Recomendación: Upstash

**Elige Upstash si:**

- ✅ Vas a desplegar en producción (Linux/cloud)
- ✅ No tienes permisos de administrador
- ✅ Quieres la misma configuración en dev y prod
- ✅ Prefieres no instalar servicios locales
- ✅ Tienes conexión a internet estable

**Elige Docker si:**

- ✅ Ya tienes Docker Desktop instalado
- ✅ Prefieres desarrollo completamente local
- ✅ No quieres depender de servicios externos
- ✅ Necesitas desarrollo offline frecuente

**Elige Memurai si:**

- ✅ Solo trabajas en Windows (no Linux/Mac)
- ✅ Tienes permisos de administrador
- ✅ No vas a desplegar en producción pronto
- ✅ Prefieres Redis nativo en Windows

---

## Opción Recomendada: Upstash Redis (Cloud - Gratis)

### ¿Por qué esta guía?

Anteriormente intentamos instalar Memurai (Redis nativo para Windows) pero fallaba por falta de permisos de administrador. Upstash resuelve ese problema porque:

- ❌ **Sin Memurai:** Requiere permisos de administrador
- ✅ **Con Upstash:** Sin instalación local, sin permisos especiales
- ✅ **Bonus:** Funciona idéntico en desarrollo (Windows) y producción (Linux)

### Paso 1: Crear cuenta en Upstash

1. Ve a: https://upstash.com/
2. Click en "Sign Up" (puedes usar tu cuenta de GitHub/Google)
3. Confirma tu email

### Paso 2: Crear base de datos Redis

1. En el dashboard, click en "Create Database"
2. Configuración:
   - **Name:** bingo-online-dev
   - **Type:** Regional
   - **Region:** Elige la más cercana (US East, EU Central, etc.)
   - **Plan:** Free (10,000 commands/day)
3. Click en "Create"

### Paso 3: Obtener la URL de conexión

1. En el dashboard de tu database, busca la sección de conexión
2. Verás tres opciones de URL diferentes
3. **IMPORTANTE:** Debes usar la URL que comienza con `rediss://` (con doble 's' para TLS)

   Ejemplo de las tres URLs que verás:

   ```bash
   # ❌ NO usar (es para redis-cli)
   redis-cli --tls -u redis://default:PASSWORD@host.upstash.io:6379

   # ❌ NO usar (es para REST API, no para ioredis)
   UPSTASH_REDIS_REST_URL="https://host.upstash.io"

   # ✅ USAR ESTA (con rediss:// para TLS)
   REDIS_URL="rediss://default:PASSWORD@host.upstash.io:6379"
   ```

4. Copia la URL completa que comienza con `rediss://` (incluye el password)

### Paso 4: Actualizar el archivo .env del backend

Abre el archivo: `apps/backend/.env`

Busca esta línea:

```env
REDIS_URL=redis://localhost:6379
```

Reemplázala con tu URL de Upstash (con `rediss://` para TLS):

```env
REDIS_URL=rediss://default:tu_password@your-redis.upstash.io:6379
```

**⚠️ IMPORTANTE:** Debe ser `rediss://` (con doble 's'), no `redis://`. Upstash requiere TLS obligatoriamente.

### Paso 5: Reiniciar el backend

1. Detén el servidor backend (Ctrl + C)
2. Inicia de nuevo:

   ```bash
   pnpm dev:backend
   ```

3. Deberías ver en los logs:
   ```
   ✅ Redis connected successfully
   ```

### Paso 6: Verificar que funciona

En los logs del backend, deberías ver:

✅ **Conexión exitosa:**

```
🔧 Connecting to Redis: rediss://default:AUa... (TLS: true)
✅ Redis connected successfully
🚀 Server running on port 3001
```

❌ **NO deberías ver:**

- `Redis: Not connected (running without persistence)`
- `⚠️ Redis not ready, skipping saveRoom`
- `ECONNREFUSED 127.0.0.1:6379` (localhost)
- `(TLS: false)` (debe ser `true`)

✅ **Cuando crees salas verás:**

- `💾 Room saved to Redis: xxx (TTL: 3600s)`

---

## Alternativa: Redis local con Docker (Si tienes Docker Desktop)

Si prefieres Redis local y tienes Docker Desktop instalado:

### 1. Iniciar Redis con Docker

```bash
docker run -d --name redis-bingo -p 6379:6379 redis:alpine
```

### 2. Verificar que está corriendo

```bash
docker ps
```

Deberías ver un contenedor llamado `redis-bingo`.

### 3. El .env ya está configurado

```env
REDIS_URL=redis://localhost:6379
```

### 4. Comandos útiles

```bash
# Detener Redis
docker stop redis-bingo

# Iniciar Redis
docker start redis-bingo

# Ver logs de Redis
docker logs redis-bingo

# Eliminar contenedor
docker rm -f redis-bingo
```

---

## Alternativa: Memurai (Redis nativo para Windows)

**⚠️ IMPORTANTE:** Requiere permisos de administrador obligatorios.

### Requisitos del Sistema

- Windows 10 / Windows Server 2016 o superior
- Sistema de 64 bits (32-bit no soportado)
- Permisos de administrador
- Puerto 6379 disponible (o configurable)

### Opción A: Instalación con Chocolatey

Abre PowerShell **como Administrador** y ejecuta:

```powershell
choco install memurai-developer -y
```

Una vez instalado, el servicio se inicia automáticamente.

### Opción B: Instalación Manual (MSI)

1. Descarga Memurai Developer: https://www.memurai.com/get-memurai
2. Ejecuta el instalador MSI **como administrador**
3. Durante la instalación puedes configurar:
   - **Carpeta de instalación:** Por defecto `C:\Program Files\Memurai`
   - **Instalar como servicio:** Recomendado (default: sí)
   - **Puerto:** Default 6379 (personalizable)
   - **Regla de Firewall:** Recomendado agregar
   - **Variable PATH:** Recomendado agregar
4. El servicio se iniciará automáticamente

### Opción C: Instalación Silenciosa (para scripts)

```powershell
# Instalación básica
msiexec /quiet /i Memurai.msi

# Instalación personalizada
msiexec /quiet /i Memurai.msi INSTALLDIR="C:\Redis" PORT=6380
```

### Verificar que está corriendo

```powershell
# Ver estado del servicio
Get-Service Memurai*

# O usar Redis CLI
memurai-cli ping
# Debería responder: PONG
```

### Configuración

El archivo de configuración está en: `C:\Program Files\Memurai\memurai.conf`

Es compatible con Redis API 7. Si cambias el puerto, debes reiniciar el servicio:

```powershell
Restart-Service Memurai
```

### Actualizar .env para Memurai

Si instalaste Memurai en el puerto default:

```env
REDIS_URL=redis://localhost:6379
```

Si cambiaste el puerto:

```env
REDIS_URL=redis://localhost:TU_PUERTO
```

### Comandos Útiles

```powershell
# Ver estado
Get-Service Memurai

# Detener servicio
Stop-Service Memurai

# Iniciar servicio
Start-Service Memurai

# Reiniciar servicio
Restart-Service Memurai

# Desinstalar
choco uninstall memurai-developer
# O desde Panel de Control → Programas y características
```

### Diferencias vs Redis Linux

Memurai es compatible con Redis API 7, pero es una implementación específica para Windows. Algunas diferencias:

- **Persistencia:** Usa RDB y AOF igual que Redis
- **Rendimiento:** Comparable a Redis en Windows (mejor que WSL)
- **Comandos:** ~100% compatible con Redis API 7
- **Módulos:** Soporte limitado de módulos Redis

### Ventajas de Memurai

✅ Redis nativo en Windows (sin WSL ni VM)
✅ Mejor rendimiento que Redis en WSL
✅ Compatible con herramientas Redis existentes
✅ Servicio de Windows con inicio automático
✅ Incluye `memurai-cli` (equivalente a `redis-cli`)

### Desventajas de Memurai

❌ Solo Windows (código no portable a Linux)
❌ Requiere permisos de administrador
❌ Versión Developer tiene limitaciones
❌ No es Redis oficial (implementación alternativa)

---

## Troubleshooting

### Error: "Redis not connected"

**Causa:** La URL de Redis es incorrecta o el servicio no está corriendo.

**Solución:**

1. Verifica que la URL en `.env` es correcta
2. Si usas Upstash, asegúrate de copiar la URL completa con password
3. Si usas Docker, verifica que el contenedor está corriendo: `docker ps`

### Error: "ECONNREFUSED"

**Causa:** Redis no está accesible en el puerto especificado.

**Solución:**

1. Si usas localhost, verifica que Redis esté corriendo
2. Si usas Upstash, verifica tu conexión a internet
3. Verifica que no hay firewall bloqueando la conexión

### Error: "Authentication required"

**Causa:** La URL no incluye el password (solo para Upstash/servicios con auth).

**Solución:**
Asegúrate que tu URL tiene el formato:

```
redis://default:PASSWORD@host:6379
```

---

## Monitoreo de Redis

### Ver qué se está guardando en Redis

#### Con Redis CLI (local):

```bash
redis-cli
> KEYS bingo:room:*
> GET bingo:room:abc123
> TTL bingo:room:abc123
```

#### Con Upstash:

Ve al dashboard de Upstash → Tu database → "Data Browser"

---

## Límites del Plan Gratuito de Upstash

- **Comandos:** 10,000 por día
- **Almacenamiento:** 256 MB
- **Conexiones concurrentes:** 1000

Para una aplicación de bingo en desarrollo, esto es más que suficiente.

Si necesitas más, el plan Pro cuesta $0.20 por 100K comandos adicionales.

---

## ¿Cuándo cambiar a un plan de pago?

Cuando veas en el dashboard de Upstash que te estás acercando al límite diario:

- **Desarrollo:** Casi nunca (< 1000 comandos/día)
- **Producción ligera:** Plan gratuito puede ser suficiente
- **Producción con tráfico:** Considera Plan Pro cuando superes 5,000 comandos/día regularmente

---

## Resumen y Decisión Final

### 🎯 Para este Proyecto (Bingo Online)

**✅ IMPLEMENTADO: Upstash Redis**

Este proyecto ya está configurado con Upstash porque:

1. **Portabilidad:** El código funciona idéntico en Windows (desarrollo) y Linux (producción)
2. **Sin permisos de admin:** No requiere instalación de servicios locales
3. **Mismo entorno:** Desarrollo y producción usan la misma infraestructura
4. **Simplicidad:** 2-3 minutos de configuración inicial
5. **Backups automáticos:** Incluidos en el plan gratuito
6. **Monitoreo:** Dashboard web incluido

### Alternativas Válidas

**Docker Redis:**

- Ideal si ya tienes Docker instalado
- Perfecto para desarrollo local
- Requiere cambiar URL en producción

**Memurai:**

- Mejor rendimiento local en Windows
- Requiere permisos de administrador
- Código no portable a Linux (producción)
- Útil para desarrollo exclusivo en Windows

### Configuración Actual

```env
# apps/backend/.env
REDIS_URL=rediss://default:PASSWORD@your-redis-host.upstash.io:6379
```

### Verificación

✅ Backend conectado con TLS: `rediss://...`
✅ Logs muestran: `✅ Redis connected successfully`
✅ Salas se persisten automáticamente
✅ Plan gratuito: 10,000 comandos/día (suficiente para desarrollo)
