# Presupuesto de fin de año

App web (en español, pensada para el celular) para planificar entre dos personas el presupuesto de Navidad, fin de año y enero: ingresos con cronograma, categorías de gastos con checkboxes de "pagado" y un comparador de destinos de vacaciones. Moneda: pesos uruguayos (UYU).

Next.js (App Router) + TypeScript + Tailwind CSS. Los datos se guardan en Upstash Redis como un único documento JSON y se comparten entre ambos. El acceso está protegido por una contraseña compartida.

## Correrlo en local

```bash
npm install
cp .env.example .env.local   # y poné tu contraseña en APP_PASSWORD
npm run dev
```

Abrí http://localhost:3000. Sin las variables de Upstash, los datos se guardan en memoria (se pierden al reiniciar): sirve para probar.

Para guardar de verdad en local, completá `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` en `.env.local`.

## Tests

```bash
npm test          # corre todo una vez
npm run test:watch
```

Cubren los cálculos (totales, pagado/pendiente, balance, redondeo, escenarios de vacaciones y "nos quedamos en casa"), la validación del documento, el control de versiones entre dos personas, la autenticación, la API y la interfaz (marcar pagado, editar montos, comparador de destinos, borrar ejemplos, guardado automático y conflictos).

## Navegación y diseño

Cuatro pantallas: **Resumen** (balance y categorías), **Gastos** (categorías y detalle de cada una), **Ingresos** y **Ajustes**. En el celular hay una barra inferior; en la computadora, una barra lateral. Cada pantalla tiene su propio link (`#/gastos/<id>`) y el botón "atrás" del navegador funciona.

Modo oscuro por defecto; en Ajustes se puede elegir Claro o Sistema. Los colores están definidos como variables en `src/app/globals.css`. También se puede instalar como app (menú del navegador → "Instalar" / "Agregar a pantalla de inicio").

## Desplegarlo en Vercel

1. Importá el repositorio en Vercel (New Project → `presupuestos`).
2. En **Storage** (o Marketplace) agregá **Upstash Redis** y conectalo al proyecto. Vercel completa solo las variables de entorno.
3. En **Settings → Environment Variables** creá `APP_PASSWORD` con la contraseña compartida (Production, Preview y Development). No se guarda en el repositorio.
4. Hacé un redeploy. Cada push a `main` despliega automáticamente.

Si cambiás `APP_PASSWORD`, las sesiones abiertas se cierran y hay que volver a entrar.

## Cómo funciona

- **Datos iniciales:** la primera vez se carga el presupuesto real (aguinaldos, salarios vacacionales, patente, seguro, lista de regalos y cumpleaños) con los montos pendientes en 0. Está en `src/lib/seed.ts` y solo se usa mientras no haya nada guardado.
- **Lista de regalos:** tiene un presupuesto general por persona; al editar el monto de alguien (cuando encuentran su regalo) ese queda fijo, y el botón ↺ lo devuelve al general.
- **Cambios de a dos:** cada guardado lleva un número de versión. Si la otra persona guardó primero, se carga su versión y se avisa. La app también se actualiza sola al volver a abrirla y cada 30 segundos.
- **Seguro de la casa:** se cuenta en el presupuesto actual aunque se pague en febrero.
- **Vacaciones:** las opciones de destino que marques se suman a los gastos; cada una muestra el balance si fuera la única elegida.
- **Secciones:** se pueden crear, renombrar, reordenar y eliminar, igual que las subsecciones y los ítems.
