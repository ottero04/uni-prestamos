# UniPréstamos 🎓

Sistema de préstamos de libros y equipos universitarios construido con Docker Compose.

## Servicios

- **Frontend**: nginx — Interfaz web
- **Backend**: Node.js + Express — API REST
- **Database**: MySQL 8 — Almacenamiento de préstamos

## Levantar el proyecto
Ejecutar "docker compose up --build" en la raíz del proyecto.

## Comandos

| Comando | Cuándo usarlo |
|---|---|
| docker compose up --build | Primera vez o cuando modificas código |
| docker compose up | Cuando ya está construido y solo quieres arrancarlo |
| docker compose stop | Para detener sin eliminar los contenedores |
| docker compose down | Para detener y eliminar los contenedores |

## Integrantes

- Robinson Andrés Ottero
- Juan Camilo Herrera