# Configuración de Seguridad de Autenticación en Supabase

**Proyecto:** Bingo Online Multijugador
**Project ID:** your-project-ref
**Región:** us-east-1
**Fecha:** 2025-10-28

## ⚠️ Configuración Manual Requerida

Las siguientes configuraciones de seguridad NO pueden aplicarse via SQL o API. Deben configurarse manualmente en el Dashboard de Supabase.

---

## 1. Habilitar Leaked Password Protection

### ¿Qué es?

La protección contra contraseñas filtradas previene que los usuarios usen contraseñas que han sido expuestas en violaciones de datos públicas (usando la base de datos HaveIBeenPwned).

### ¿Por qué es importante?

- **OWASP Top 10 A07:2021** - Identification and Authentication Failures
- Previene ataques de credential stuffing
- Reduce el riesgo de cuentas comprometidas
- Mejora la postura general de seguridad

### Instrucciones para Habilitar:

1. Acceder al Dashboard de Supabase:
   - URL: https://supabase.com/dashboard/project/your-project-ref

2. Navegar a: **Authentication → Policies**

3. En la sección **Password Protection**, habilitar:

   ```
   ☑ Enable leaked password protection
   ```

4. Configuraciones recomendadas:
   - **Threshold**: Strict (passwords found in breaches will be rejected)
   - **Enforcement**: On signup and password change

5. Guardar los cambios

### Impacto:

- ✅ Las contraseñas comprometidas serán rechazadas automáticamente
- ✅ Los usuarios recibirán un mensaje claro para elegir otra contraseña
- ⚠️ Puede requerir que algunos usuarios existentes cambien sus contraseñas

---

## 2. Otras Configuraciones de Seguridad Recomendadas

### A. Rate Limiting en Auth (Ya implementado en backend)

Nuestro backend ya implementa rate limiting, pero Supabase también ofrece protección nativa:

**Ubicación:** Authentication → Rate Limits

Configuración recomendada:

```
Login attempts: 5 per 15 minutes
Password reset: 3 per hour
Email verification: 3 per hour
```

### B. Password Requirements

**Ubicación:** Authentication → Policies → Password Strength

Configuración actual y recomendada:

```
☑ Minimum length: 8 characters
☑ Require uppercase letters
☑ Require lowercase letters
☑ Require numbers
☑ Require special characters
```

### C. Session Configuration

**Ubicación:** Authentication → Sessions

Configuración recomendada:

```
Session timeout: 604800 seconds (7 días)
Refresh token rotation: Enabled
JWT expiration: 3600 seconds (1 hora)
```

### D. Email Templates Customization

**Ubicación:** Authentication → Email Templates

Personalizar para el branding de Bingo Online:

- Confirmation email
- Password reset email
- Magic link email
- Email change confirmation

---

## 3. Verificación de Configuración

### Checklist de Seguridad Auth

- [ ] Leaked password protection habilitada
- [ ] Rate limiting configurado en Supabase
- [ ] Password strength requirements configurados
- [ ] Session timeout apropiado
- [ ] Refresh token rotation habilitado
- [ ] Email templates personalizados
- [ ] MFA disponible (Multi-Factor Authentication) - opcional pero recomendado

### Cómo Verificar:

1. **Leaked Password Protection:**
   - Intentar registrar un usuario con contraseña débil conocida: `password123`
   - Debe ser rechazada

2. **Rate Limiting:**
   - Intentar 6 logins fallidos consecutivos
   - El 6to intento debe ser bloqueado

3. **Password Requirements:**
   - Intentar registrar con contraseña débil: `abc`
   - Debe ser rechazada

---

## 4. Logs y Monitoreo

Para monitorear intentos de acceso y seguridad:

**Ubicación:** Authentication → Logs

Eventos importantes a monitorear:

- `user_signedup` - Nuevos registros
- `user_failed_signin` - Intentos fallidos de login
- `user_password_reset_requested` - Solicitudes de reseteo
- `user_password_changed` - Cambios de contraseña

---

## 5. Documentación Oficial

- [Supabase Auth Security Best Practices](https://supabase.com/docs/guides/auth/auth-helpers/auth-ui#security-considerations)
- [Password Security](https://supabase.com/docs/guides/auth/passwords)
- [Rate Limiting](https://supabase.com/docs/guides/auth/rate-limits)

---

## Estado Actual del Proyecto

✅ **Backend:**

- Rate limiting implementado (authLimiter, paymentCreateLimiter, adminActionLimiter)
- JWT validation con Supabase
- Row Level Security en todas las tablas
- Audit trail para pagos

⚠️ **Pendiente en Supabase Dashboard:**

- Habilitar leaked password protection (acción manual requerida)
- Revisar configuración de rate limits nativos de Supabase
- Personalizar email templates

---

## Notas Técnicas

**¿Por qué no via API?**

Supabase no expone estas configuraciones via Management API por razones de seguridad. Son configuraciones críticas que requieren acceso directo al dashboard con permisos de propietario del proyecto.

**Alternativa para Automatización:**

Si necesitas automatizar en el futuro, Supabase ofrece:

- Supabase CLI: `supabase projects api-keys --project-ref your-project-ref`
- Infrastructure as Code: Terraform provider para Supabase (experimental)

---

**Última actualización:** 2025-10-28
**Responsable:** Equipo de Desarrollo
**Próxima revisión:** Antes de despliegue a producción
