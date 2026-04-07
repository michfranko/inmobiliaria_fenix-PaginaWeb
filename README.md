# Inmobiliaria Fenix - Panel Administrativo

Sistema integral de gestion inmobiliaria diseñado para optimizar el flujo de ventas, rentas y seguimiento de clientes mediante una arquitectura basada en Angular y Firebase.

## Arquitectura del Proyecto

El sistema se estructura en tres pilares fundamentales:

1. Gestion de Inventario (Mantenimiento): Registro tecnico de propiedades con logica adaptativa para terrenos y casas.
2. CRM de Contactos (Directorio): Gestion centrada en personas con portafolio automatizado y asignacion de roles inteligente.
3. Flujo Operativo (Seguimiento): Tablero Kanban para el control de interacciones comerciales mediante un sistema de tickets.

---

## Guia para el Mantenimiento del Codigo

### Procedimiento para agregar nuevos campos a una Propiedad
1. Modificar la interfaz en: src/app/models/property.ts.
2. Actualizar el metodo inicializarNuevaPropiedad en: propiedad.component.ts para incluir el valor inicial.
3. Añadir el componente de entrada en: propiedad.component.html respetando la clase CSS property-form-group.
4. Si el campo es de caracter obligatorio, incluirlo en la validacion del metodo esPasoValido() en el controlador.

### Logica de Automatizacion de Roles
El sistema elimina la necesidad de asignar roles manuales a los contactos nuevos.
- Funcionamiento: Al ejecutar la operacion de guardado en PropiedadComponent, el sistema analiza los codigos de contacto en los campos Propietario y Encargado.
- Accion: Se invoca ContactService.updateContact para actualizar el atributo rol a 'propietario' o 'responsable' respectivamente en la base de datos distribuida.

### Estructura del Tablero de Seguimiento (Kanban)
Los registros de seguimiento se transforman visualmente en tickets dentro de seguimiento.component.ts.
- Columna Recibidos: Filtra registros con estado 'contactado'.
- Columna En Gestion: Agrupa registros con estados 'visita agendada' o 'en negociacion'.
- Columna Finalizados: Muestra registros con estado 'cerrado'.

---

## Estandares de Diseño y Usabilidad (UI/UX)

- Paleta de Colores: Fondo principal #121212, Acentos #FFBE2D (Dorado Fenix).
- Principios Heuristicos Aplicados:
    - Prevencion de Errores: Validacion de pasos obligatorios antes de permitir la navegacion en formularios.
    - Visibilidad del Estado: Indicadores de progreso (stepper) con iconos de confirmacion y barras de carga.
    - Consistencia: Empleo de clases globales .btn-main y .btn-sec para acciones estandarizadas.

---

## Despliegue y Administracion
- Instalacion de dependencias: npm install
- Servidor de desarrollo: ng serve
- Compilacion de produccion: ng build

---
Documentacion tecnica generada para el equipo de desarrollo de Inmobiliaria Fenix.
