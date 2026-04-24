# Comercios - Maestro De Direcciones

Este archivo funciona como maestro de curacion para completar direcciones por local antes de pasarlas al dataset final de la app.

## Objetivo

- Registrar direccion completa por comercio o sucursal.
- Guardar coordenadas si existen.
- Marcar estado de validacion.
- Separar claramente el nombre comercial de la direccion.

## Uso Recomendado

1. Cargar un lote chico de locales por vez.
2. Si ya existe una direccion dentro del nombre actual del dataset, separarla y marcarla como extraida.
3. Si vienen coordenadas o un link de Maps, completar lat y lng y luego validar la direccion.
4. Solo despues de validar, migrar el dato al dataset definitivo de la app.

## Nota Sobre El Pin De Maps Actual

La tabla de comercios ya tiene un icono de Maps en la app, pero hoy ese link no sale de una base curada por sucursal.

Se construye como una busqueda de Google Maps usando:

- direccion extraida si existe
- si no, nombre del comercio
- localidad
- el sufijo `Argentina`

Por eso el valor de `maps_url` en este maestro puede tener dos usos:

- `provisional`: link generado por la app, util para empezar el relevamiento
- `validado`: link confirmado contra una sucursal concreta o coordenadas reales

Formato provisional usado por la app:

`https://www.google.com/maps/search/<query>`

Donde `<query>` es una combinacion URL-encoded de:

- `direccion + localidad + Argentina`
- o `nombre + localidad + Argentina` cuando no hay direccion

## Estados

- `extraido-del-nombre`: la direccion se separo del string original actual.
- `maps-generado`: existe un link provisional de Maps generado por la app.
- `pendiente-coordenadas`: falta lat o lng.
- `pendiente-validacion`: hay direccion, pero no esta confirmada.
- `validado`: direccion lista para pasar al dataset final.
- `descartar`: registro ambiguo o duplicado sin resolver.

## Esquema De Registro

| id_localidad | localidad | nombre_actual_dataset | nombre_normalizado | direccion | lat | lng | maps_url | fuente | estado | notas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 |  |  |  |  |  |  |  |  | pendiente-coordenadas |  |

## Lote Semilla

Registros armados a partir de nombres que ya traen direccion visible en el dataset actual. Son utiles como base, pero varios siguen sin validacion geografica.

| id_localidad | localidad | nombre_actual_dataset | nombre_normalizado | direccion | lat | lng | maps_url | fuente | estado | notas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 3 | 25 De Mayo | Autoservicio Don Nicol - Calle 18 | Autoservicio Don Nicol | Calle 18 |  |  | [buscar](https://www.google.com/maps/search/Calle%2018%2025%20De%20Mayo%20Argentina) | dataset-actual | extraido-del-nombre | Falta numero exacto o cruce |
| 3 | 25 De Mayo | Carniceria Gaston - Calle 9 Esquina 25 | Carniceria Gaston | Calle 9 Esquina 25 |  |  | [buscar](https://www.google.com/maps/search/Calle%209%20Esquina%2025%2025%20De%20Mayo%20Argentina) | dataset-actual | extraido-del-nombre | Candidato fuerte |
| 3 | 25 De Mayo | Dia Tienda 226 - Calle 9 Esq. 32 | Dia Tienda 226 | Calle 9 Esq. 32 |  |  | [buscar](https://www.google.com/maps/search/Calle%209%20Esq.%2032%2025%20De%20Mayo%20Argentina) | dataset-actual | extraido-del-nombre | Sucursal identificable |
| 16 | 9 De Abril | Cabana Don Theo - Autopista Ruta De La Tradicion | Cabana Don Theo | Autopista Ruta De La Tradicion |  |  | [buscar](https://www.google.com/maps/search/Autopista%20Ruta%20De%20La%20Tradicion%209%20De%20Abril%20Argentina) | dataset-actual | extraido-del-nombre | Revisar altura o km |
| 18 | 9 De Julio | Don Lino Gastro Srl - La Rioja | Don Lino Gastro Srl | La Rioja |  |  | [buscar](https://www.google.com/maps/search/La%20Rioja%209%20De%20Julio%20Argentina) | dataset-actual | extraido-del-nombre | Direccion parcial |
| 31 | Acassuso | Colonial-Colonial Acas - Avenida Santa Fe | Colonial-Colonial Acas | Avenida Santa Fe |  |  | [buscar](https://www.google.com/maps/search/Avenida%20Santa%20Fe%20Acassuso%20Argentina) | dataset-actual | extraido-del-nombre | Revisar numeracion |
| 31 | Acassuso | Todo Ternera Srl - Albarellos | Todo Ternera Srl | Albarellos |  |  | [buscar](https://www.google.com/maps/search/Albarellos%20Acassuso%20Argentina) | dataset-actual | extraido-del-nombre | Direccion parcial |
| 31 | Acassuso | Wine Con Alas - Avenida Libertador | Wine Con Alas | Avenida Libertador |  |  | [buscar](https://www.google.com/maps/search/Avenida%20Libertador%20Acassuso%20Argentina) | dataset-actual | extraido-del-nombre | Revisar numeracion |
| 41 | Bahia Blanca | El Cantinero Bebidas - Brown | El Cantinero Bebidas | Brown |  |  | [buscar](https://www.google.com/maps/search/Brown%20Bahia%20Blanca%20Argentina) | dataset-actual | extraido-del-nombre | Direccion parcial |
| 46 | Adrogue | Adrofiesta - Diag Alte Guillermo Brown | Adrofiesta | Diag Alte Guillermo Brown |  |  | [buscar](https://www.google.com/maps/search/Diag%20Alte%20Guillermo%20Brown%20Adrogue%20Argentina) | dataset-actual | extraido-del-nombre | Falta altura |
| 66 | Bragado | Autoservicio Ideal - Paso | Autoservicio Ideal | Paso |  |  | [buscar](https://www.google.com/maps/search/Paso%20Bragado%20Argentina) | dataset-actual | extraido-del-nombre | Direccion parcial |
| 80 | Almagro | Parrilla Lo De Fran - Jeronimo Salguero | Parrilla Lo De Fran | Jeronimo Salguero |  |  | [buscar](https://www.google.com/maps/search/Jeronimo%20Salguero%20Almagro%20Argentina) | dataset-actual | extraido-del-nombre | Falta altura |
| 89 | Alta Gracia | Bonafide - Av Belgrano | Bonafide | Av Belgrano |  |  | [buscar](https://www.google.com/maps/search/Av%20Belgrano%20Alta%20Gracia%20Argentina) | dataset-actual | extraido-del-nombre | Revisar sucursal exacta |
| 92 | Alta Cordoba | Panes De Juan - Mahatma Gandhi | Panes De Juan | Mahatma Gandhi |  |  | [buscar](https://www.google.com/maps/search/Mahatma%20Gandhi%20Alta%20Cordoba%20Argentina) | dataset-actual | extraido-del-nombre | Falta numeracion |
| 125 | Arguello | Juan Valdez Cafe Aero1 - Av La Voz Del Interior | Juan Valdez Cafe Aero1 | Av La Voz Del Interior |  |  | [buscar](https://www.google.com/maps/search/Av%20La%20Voz%20Del%20Interior%20Arguello%20Argentina) | dataset-actual | extraido-del-nombre | Ubicacion aeroportuaria |

## Lote Pendiente De Coordenadas

Completar aca los registros que vengan desde Maps, links o coordenadas.

| id_localidad | localidad | nombre_actual_dataset | nombre_normalizado | direccion | lat | lng | maps_url | fuente | estado | notas |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Reglas De Normalizacion

- Mantener `nombre_actual_dataset` sin tocar para trazabilidad.
- Guardar en `nombre_normalizado` el nombre comercial sin direccion embebida.
- Guardar en `direccion` solo calle, altura, cruce, km o referencia util.
- Si `maps_url` sale del pin actual de la app, tratarlo como dato provisional, no definitivo.
- No inventar numeracion si no aparece en fuente.
- Si una cadena es demasiado ambigua, dejar `pendiente-validacion`.

## Criterio Para Pasar A Produccion

Un registro puede pasar al dataset final cuando cumple con al menos una de estas condiciones:

- Tiene direccion completa validada.
- Tiene coordenadas validas y direccion consistente.
- Tiene referencia suficiente para Maps y no genera ambiguedad con otra sucursal de la misma localidad.

## Proximo Paso

Cuando tengas coordenadas o links de Maps, este archivo se puede completar por lotes y luego transformar a una estructura utilizable por la app.