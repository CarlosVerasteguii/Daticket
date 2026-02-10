# 🛒 Smart Shopping Assistant

> **Estado**: Investigación
> **Fecha**: 2026-02-07
> **Prioridad**: Por definir

## Concepto

Convertir Daticket en un asistente de compras inteligente que:
1. Trackea productos que el usuario compra frecuentemente
2. Monitorea precios en supermercados online (scraping)
3. Notifica cuando hay oportunidades de ahorro

## Flujo Propuesto

```
Recibo escaneado → Extraer productos → Guardar en lista de compras frecuentes
                                              ↓
                        Cron Job: Scrapear precios de supermercados
                                              ↓
                        Si precio_actual < precio_promedio → Notificar usuario
```

## Supermercados Target

| Super | URL | Plataforma | Viabilidad | Prioridad |
|-------|-----|------------|------------|-----------|
| **HEB** | heb.com.mx | VTEX (React SPA) | ✅ Viable con Playwright | 🥇 MVP |
| **Walmart** | walmart.com.mx | React/Next.js | ⚠️ Requiere servicio pago | 🥉 V2 |
| Soriana | soriana.com | Por investigar | ❓ | - |

## Hallazgos Walmart (Investigación 2026-02-07)

### APIs Disponibles

| API | Descripción | Acceso |
|-----|-------------|--------|
| **Marketplace API** | Para vendedores, gestión de inventario | Solo sellers registrados |
| **Realtime Pricing API** | Precios y disponibilidad por tienda | OAuth + partner |
| **API Pública de Productos** | ❌ NO EXISTE | - |

> ⚠️ **Conclusión**: Walmart NO tiene API pública para consultar precios como consumidor.

### Protecciones Anti-Bot
- **Arkose Labs** (captcha "mantén presionado") - Muy difícil de bypass
- Rate limiting agresivo
- Detección de headless browsers (Playwright/Puppeteer)
- Cookies de sesión obligatorias
- Rotación de selectores DOM frecuente

### Técnicos
- **Tecnología**: React / Next.js (SPA)
- **URL Búsqueda**: `/search?q=mayonesa`
- **URL Producto**: `/p/[nombre-producto]/[SKU]`
- **SKU**: Numérico, ej: `00750100331002`
- **Localización**: Requiere código postal para precios

### Opciones de Acceso
1. **Servicio de scraping pago**: ScrapingBee, Apify, Oxylabs (~$50-100/mes)
2. **Agregadores terceros**: Tiendeo.mx tiene catálogos de Walmart
3. **Esperar**: Walmart podría abrir API pública en el futuro

### Recomendación
🎯 **Descartar Walmart para el MVP**. Enfocarse en HEB que es gratis y viable.
Considerar Walmart en V2 si hay presupuesto para servicio de scraping.

## Hallazgos HEB (Investigación 2026-02-07)

### Técnicos
- **Plataforma**: VTEX (e-commerce React-based)
- **Renderizado**: Client-side (SPA) - requiere navegador headless
- **URL Búsqueda**: `/mayonesa?_q=mayonesa&map=ft`
- **URL Producto**: `/nombre-producto-SKU/p`
- **Anti-bot**: No CAPTCHAs detectados, pero VTEX tiene rate limiting

### Factor Crítico
⚠️ **Precios NO aparecen sin seleccionar tienda**
- Solución: El scraper debe simular selección de tienda o manejar cookie `vtex_segment`
- Usuario debe configurar su ciudad en Daticket

## Opciones de Implementación

### 1. GitHub Actions (Por evaluar)
- Cron schedule para correr scraper
- Gratis hasta cierto límite de minutos
- Guardaria resultados en Supabase

### 2. Supabase Edge Functions
- Integración nativa con la BD
- Puede usar pg_cron para schedule
- Limitado en tiempo de ejecución

### 3. Servicio externo (Apify, ScrapingBee)
- Más robusto para scraping
- Costo adicional
- Escalable

### 4. Playwright en Vercel Cron
- Serverless functions con schedule
- 10 segundos límite (plan gratis)

## Modelo de Datos Propuesto

```sql
-- Productos que el usuario compra frecuentemente
CREATE TABLE user_shopping_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  avg_price DECIMAL(10,2),
  purchase_frequency_days INT,
  last_purchase_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Precios scrapeados
CREATE TABLE product_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id TEXT NOT NULL, -- 'heb', 'walmart'
  product_name TEXT NOT NULL,
  product_sku TEXT,
  current_price DECIMAL(10,2),
  original_price DECIMAL(10,2), -- Si promoción
  promotion_type TEXT, -- '3x2', '20% off'
  scraped_at TIMESTAMPTZ DEFAULT now()
);

-- Alertas
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users,
  product_name TEXT,
  store_id TEXT,
  alert_type TEXT, -- 'price_drop', 'promotion'
  current_price DECIMAL(10,2),
  user_avg_price DECIMAL(10,2),
  savings_percent DECIMAL(5,2),
  notified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Decisiones Pendientes

- [ ] Método de scraping: GitHub Actions vs Edge Functions vs Externo
- [ ] Frecuencia de scraping (diario, cada 12h, semanal)
- [ ] Cómo manejar la localización/tienda del usuario
- [ ] Tipo de notificaciones (push, email, in-app)
- [ ] Si cobrar por esta feature (plan premium?)

## Recursos

- [Recording de investigación HEB](/.gemini/antigravity/brain/37eb9df0-36dc-4829-b5ad-e332c06f3909/heb_scraping_analysis_1770525759699.webp)
- VTEX API docs (investigar GraphQL endpoints)

---

*Documentado durante sesión de investigación*
