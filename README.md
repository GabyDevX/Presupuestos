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

## Desplegarlo en Vercel

1. Importá el repositorio en Vercel (New Project → `presupuestos`).
2. En **Storage** (o Marketplace) agregá **Upstash Redis** y conectalo al proyecto. Vercel completa solo las variables de entorno.
3. En **Settings → Environment Variables** creá `APP_PASSWORD` con la contraseña compartida (Production, Preview y Development).
4. Hacé un redeploy. Cada push a `main` despliega automáticamente.

Si cambiás `APP_PASSWORD`, las sesiones abiertas se cierran y hay que volver a entrar.

## Cómo funciona

- **Datos de ejemplo:** la primera vez aparecen ítems ficticios marcados con "(ejemplo)". El botón **Borrar ejemplos** los elimina y deja la estructura intacta.
- **Cambios de a dos:** cada guardado lleva un número de versión. Si la otra persona guardó primero, se carga su versión y se avisa. La app también se actualiza sola al volver a abrirla y cada 30 segundos.
- **Seguro de la casa:** se cuenta en el presupuesto actual aunque se pague en febrero.
- **Vacaciones:** las opciones de destino que marques se suman a los gastos; cada una muestra el balance si fuera la única elegida.
- **Secciones:** se pueden crear, renombrar, reordenar y eliminar, igual que las subsecciones y los ítems.
