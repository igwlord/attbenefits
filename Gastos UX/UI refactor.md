# Rediseño visual de métricas y gráficos — Sección Gastos

## Contexto

El layout general de la pantalla **Gastos** ya está bien resuelto y no debe cambiarse estructuralmente.  
El problema actual está en la **calidad visual de los componentes de métricas y data visualization**.

Hoy las barras, líneas y gráficos se ven:

- toscos
- demasiado planos
- poco refinados
- visualmente amateurs
- desconectados del nivel visual que debería tener un dashboard dark premium

No quiero más cambios de ancho global ni de layout general.  
Quiero una mejora enfocada en **la presentación visual de las métricas**.

---

## Objetivo

Rediseñar la parte visual de los componentes de métricas de la sección **Gastos** para que se vea más:

- premium
- moderna
- limpia
- profesional
- precisa
- coherente con una app dark elegante

La pantalla debe transmitir más sensación de:

- control financiero
- claridad
- precisión
- producto serio
- dashboard fintech moderno

---

## Alcance exacto

Mejorar exclusivamente estos componentes dentro de la pantalla **Gastos**:

1. **Barra de progreso superior del presupuesto mensual**
2. **Gráfico de historial mensual**
3. **Barras de desglose por rubro**

---

## Restricciones

### No hacer

- No cambiar el wrapper global
- No tocar el ancho general de la pantalla
- No modificar la estructura principal del layout
- No agrandar todo indiscriminadamente
- No rehacer la pantalla completa
- No cambiar lógica de negocio
- No romper funcionalidad existente
- No meter efectos exagerados
- No abusar de glow, sombras o gradientes saturados
- No convertirlo en algo recargado

### Sí hacer

- Refactorizar visualmente los componentes si el planteo actual está mal
- Mejorar jerarquía, espaciado, proporciones y refinamiento visual
- Mantener consistencia con la estética dark de la app
- Entregar el código final ya integrado

---

## Problemas actuales

### 1. Barra de presupuesto superior

Problemas:

- se ve demasiado gruesa o plana
- parece una línea roja dura, no una progress bar premium
- falta refinamiento entre track, fill y labels
- la alineación entre monto, progreso y restante puede mejorar

### 2. Historial mensual

Problemas:

- el gráfico se ve improvisado
- la barra principal se ve pobre y poco elegante
- la relación entre barra, grid, ejes y labels no está bien resuelta
- se siente como un bloque vacío con una barra suelta
- falta ritmo visual y lectura clara

### 3. Desglose por rubro

Problemas:

- las barras horizontales se ven toscas
- track y fill son demasiado duros
- porcentajes y montos no se sienten refinados
- falta mejor alineación y separación vertical
- el bloque no transmite precisión visual

---

## Cambios requeridos

## 1) Barra de presupuesto superior

Quiero que:

- se vea más elegante y menos tosca
- tenga un grosor mejor resuelto
- el track sea más sutil
- el fill sea más refinado
- los bordes y radios sean finos y coherentes
- haya mejor relación visual entre:
  - monto principal
  - barra
  - labels de gastado/restante
- se sienta como una progress bar premium de dashboard financiero

### Dirección visual

- menos pesada
- menos “línea roja plana”
- más sofisticada
- más limpia
- mejor integrada al card principal

---

## 2) Historial mensual

Quiero rehacer visualmente el gráfico para que:

- se vea más profesional
- tenga mejor escala
- tenga grid lines sutiles
- tenga ejes y labels más claros
- las barras tengan mejor proporción ancho/espacio
- se entienda rápido sin verse tosco
- se integre naturalmente al dashboard

### Requisitos específicos

- mejorar el ritmo visual del chart
- mejorar spacing entre barras y meses
- mejorar baseline
- mejorar leyenda de categorías
- evitar sensación de “una sola barra perdida”
- si es necesario, refactorizar el componente actual
- mantener la información actual, pero con mejor presentación

### Dirección visual

- chart fintech moderno
- limpio
- minimalista
- oscuro
- preciso
- con grillas sutiles, no invasivas

---

## 3) Desglose por rubro

Quiero rediseñar las barras horizontales para que:

- se vean más limpias y modernas
- el track sea más sutil
- el fill sea más prolijo
- haya mejor alineación entre:
  - nombre del rubro
  - barra
  - monto
  - porcentaje
- se mejore la separación vertical entre ítems
- el bloque tenga más lectura y más sensación de exactitud

### Dirección visual

- financial breakdown compacto
- lectura clara
- precisión visual
- composición equilibrada
- sin elementos duros ni pesados

---

## Criterios visuales obligatorios

Aplicar estos principios:

- usar una escala visual más fina
- reducir sensación de pesadez
- evitar fills demasiado gruesos
- evitar bordes exagerados
- evitar sombras excesivas
- evitar saturación excesiva en superficies grandes
- usar rojo/naranja como acento, no como mancha dominante
- priorizar sofisticación sobre impacto bruto
- priorizar claridad sobre decoración
- mantener consistencia entre los 3 componentes

---

## Referencia de calidad deseada

El resultado debe sentirse más cercano a:

- un dashboard fintech moderno
- una app SaaS premium
- una visualización sobria y profesional

Y menos cercano a:

- un mockup básico
- barras improvisadas con CSS duro
- gráficos “dibujados a mano”
- líneas pesadas o rígidas

---

## Resultado esperado

Quiero que la pantalla **Gastos** conserve su layout general, pero que sus visualizaciones se vean claramente mejor en:

- refinamiento
- jerarquía
- alineación
- sutileza
- lectura
- sensación de producto profesional

---

## Entrega esperada

- aplicar cambios directamente sobre el código actual
- no devolver teoría
- no limitarse a tocar tamaños superficiales
- si un componente está mal planteado, refactorizarlo
- mostrar el código final integrado
