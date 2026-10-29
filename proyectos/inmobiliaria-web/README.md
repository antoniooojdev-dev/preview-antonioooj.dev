# Habita — portal inmobiliario

Web para una inmobiliaria con buscador avanzado, favoritos, ficha de vivienda, calculadora de hipoteca y valoración automática. Está hecha en **HTML, CSS y JavaScript sin dependencias**: basta con abrir `index.html`.

## Funciones

| Función | Detalle |
| --- | --- |
| Buscador | Compra/alquiler, texto libre (sin distinguir tildes), ciudad, tipo, habitaciones, precio máximo y extras |
| Ordenación | Recientes, precio, metros, mejor €/m² |
| URL compartible | Los filtros se guardan en la URL (`?op=alquiler&ciudad=Madrid&extra=terraza`) |
| Favoritos | Se guardan en `localStorage`, con contador y vista "solo favoritos" |
| Ficha | `<dialog>` nativo con datos, hipoteca estimada, formulario de visita y botón de compartir (`?ref=102` abre la ficha directamente) |
| Hipoteca | Sistema francés: cuota, intereses totales y ahorro necesario (entrada + 10 % de gastos) |
| Valoración | Mediana de €/m² de las viviendas en venta en la ciudad, ajustada por estado y extras |
| Imágenes | Ilustraciones SVG generadas por código, sin peso de fotos |

## Estructura

```
inmobiliaria-web/
├── index.html
├── css/styles.css
└── js/
    ├── propiedades.js   datos de las viviendas y de la agencia
    └── app.js           filtros, render, favoritos, modal, hipoteca, valoración
```

## Fórmula de la hipoteca

```js
// P = préstamo, r = interés mensual, n = número de cuotas
cuota = (P * r) / (1 - (1 + r) ** -n);
```

## Llevarlo a producción

- Sustituir `propiedades.js` por una llamada a la API del CRM (`fetch('/api/propiedades')`). El resto del código no cambia.
- Cambiar los `mailto:` del formulario de visita por un endpoint propio o un servicio de formularios.
