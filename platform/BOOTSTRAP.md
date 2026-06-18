# Bootstrap Fase 0

```powershell
cd C:\Users\sotelos\FARMATOTAL\platform

# 1. Habilitar pnpm via corepack (viene con Node)
corepack enable
corepack prepare pnpm@9.15.0 --activate

# 2. Vars de entorno
Copy-Item .env.example .env
Copy-Item apps\api\.env.example apps\api\.env

# Editar JWT_ACCESS_SECRET y JWT_REFRESH_SECRET en .env (32 chars +)
# Generar uno: powershell "[Convert]::ToBase64String((1..32 | %{[byte](Get-Random -Maximum 256)}))"

# 3. Install (estamos en red corp, .npmrc ya tiene strict-ssl=false)
pnpm install

# 4. Generar primera migracion (crea esquema farmatotal_app + tablas)
pnpm db:gen
pnpm db:push   # aplica direct al DB del 34

# 5. Levantar API
pnpm --filter @ft/api dev

# 6. En otra terminal — crear primer admin
curl -X POST http://localhost:4000/auth/bootstrap `
  -H "Content-Type: application/json" `
  -d '{"email":"informatica@santaclara.com.py","password":"CHANGE_ME","name":"Silvio"}'

# 7. Login para verificar
curl -X POST http://localhost:4000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"informatica@santaclara.com.py","password":"CHANGE_ME"}'

# 8. Abrir docs OpenAPI
start http://localhost:4000/docs
```

Si algo rompe, verificar `pnpm dev` log en `apps/api` y `health/db`:

```powershell
curl http://localhost:4000/health/db
```
