// URL base del backend, apunta al contenedor de Node.js en Docker
const API_URL = 'http://localhost:3000';

// referencias a los elementos del HTML que vamos a manipular
const formPrestamo = document.getElementById('form-prestamo');
const listaPrestamos = document.getElementById('lista-prestamos');
const mensajeRegistro = document.getElementById('mensaje-registro');
const btnActualizar = document.getElementById('btn-actualizar');
const btnVerificar = document.getElementById('btn-verificar');
const statusBackend = document.getElementById('status-backend');
const statusDatabase = document.getElementById('status-database');

// cuando el HTML termine de cargar ejecutamos las funciones iniciales
document.addEventListener('DOMContentLoaded', () => {
    // evita que el usuario seleccione una fecha de devolucion anterior a hoy
    const fechaInput = document.getElementById('fecha_devolucion');
    const hoy = new Date().toISOString().split('T')[0];
    fechaInput.setAttribute('min', hoy);

    // cargamos los prestamos y verificamos el estado del sistema al abrir la pagina
    cargarPrestamos();
    verificarConexiones();
});

// asignamos las funciones a los eventos de los botones y el formulario
formPrestamo.addEventListener('submit', registrarPrestamo);
btnActualizar.addEventListener('click', cargarPrestamos);
btnVerificar.addEventListener('click', verificarConexiones);

// envia los datos del formulario al backend para crear un nuevo prestamo
async function registrarPrestamo(event) {
    // evita que el formulario recargue la pagina al hacer submit
    event.preventDefault();

    // recogemos los valores de cada campo del formulario
    const datos = {
        estudiante: document.getElementById('estudiante').value,
        item: document.getElementById('item').value,
        tipo: document.getElementById('tipo').value,
        fecha_devolucion: document.getElementById('fecha_devolucion').value
    };

    try {
        // hacemos POST al backend con los datos en formato JSON
        const response = await fetch(`${API_URL}/prestamos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });

        const resultado = await response.json();

        if (response.ok) {
            // si fue exitoso mostramos mensaje verde, limpiamos el formulario y recargamos la lista
            mostrarMensaje(mensajeRegistro, 'Préstamo registrado exitosamente', 'success');
            formPrestamo.reset();
            cargarPrestamos();
        } else {
            // si el backend devuelve un error lo mostramos al usuario
            mostrarMensaje(mensajeRegistro, resultado.error || 'Error al registrar', 'error');
        }
    } catch (error) {
        // si no hay conexion con el backend mostramos error de red
        console.error('Error:', error);
        mostrarMensaje(mensajeRegistro, 'Error de conexión con el servidor', 'error');
    }
}

// consulta al backend la lista de prestamos activos y los renderiza en pantalla
async function cargarPrestamos() {
    listaPrestamos.innerHTML = '<p class="loading">Cargando préstamos...</p>';

    try {
        const response = await fetch(`${API_URL}/prestamos`);
        const prestamos = await response.json();

        // si no hay prestamos mostramos un mensaje en lugar de una lista vacia
        if (prestamos.length === 0) {
            listaPrestamos.innerHTML = `
                <div class="empty-state">
                    <p>No hay préstamos registrados</p>
                </div>
            `;
            return;
        }

        // construimos una tarjeta HTML por cada prestamo recibido
        // usamos escapeHtml para prevenir ataques XSS con datos maliciosos
        listaPrestamos.innerHTML = prestamos.map(prestamo => `
            <div class="prestamo-item">
                <div class="prestamo-info">
                    <h3>${escapeHtml(prestamo.item)}</h3>
                    <p>Estudiante: ${escapeHtml(prestamo.estudiante)}</p>
                    <p>Devolución: ${formatearFecha(prestamo.fecha_devolucion)}</p>
                    <span class="prestamo-tipo tipo-${prestamo.tipo}">${prestamo.tipo}</span>
                </div>
                <button class="btn btn-danger" onclick="eliminarPrestamo(${prestamo.id})">
                    Devolver
                </button>
            </div>
        `).join('');

    } catch (error) {
        // si falla la conexion mostramos mensaje de error en el area de la lista
        console.error('Error:', error);
        listaPrestamos.innerHTML = `
            <div class="empty-state">
                <p>Error al cargar préstamos. Verifica la conexión.</p>
            </div>
        `;
    }
}

// marca un prestamo como devuelto enviando DELETE al backend con el id
async function eliminarPrestamo(id) {
    // pedimos confirmacion antes de procesar la devolucion
    if (!confirm('¿Confirmar devolución del artículo?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/prestamos/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // recargamos la lista para que el prestamo devuelto desaparezca
            cargarPrestamos();
        } else {
            alert('Error al procesar la devolución');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión con el servidor');
    }
}

// consulta el endpoint /health del backend para saber si el sistema esta activo
async function verificarConexiones() {
    statusBackend.textContent = 'Verificando...';
    statusBackend.className = 'status-badge status-checking';

    try {
        const response = await fetch(`${API_URL}/health`);
        const data = await response.json();

        if (response.ok) {
            statusBackend.textContent = 'Activo';
            statusBackend.className = 'status-badge status-active';

            // el health tambien nos dice si la base de datos esta conectada
            if (data.database === 'connected') {
                statusDatabase.textContent = 'Conectada';
                statusDatabase.className = 'status-badge status-active';
            } else {
                statusDatabase.textContent = 'Desconectada';
                statusDatabase.className = 'status-badge status-inactive';
            }
        } else {
            throw new Error('Backend no disponible');
        }
    } catch (error) {
        // si no responde el backend marcamos ambos como inactivos
        statusBackend.textContent = 'Inactivo';
        statusBackend.className = 'status-badge status-inactive';
        statusDatabase.textContent = 'Desconocido';
        statusDatabase.className = 'status-badge status-inactive';
    }
}

// muestra un mensaje de exito o error debajo del formulario y lo oculta a los 4 segundos
function mostrarMensaje(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className = `mensaje ${tipo}`;

    setTimeout(() => {
        elemento.className = 'mensaje';
        elemento.textContent = '';
    }, 4000);
}

// crea un elemento div temporal para escapar caracteres especiales y evitar XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// convierte la fecha de formato ISO a un formato legible en español (ej: 15 de abril de 2026)
function formatearFecha(fecha) {
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(fecha).toLocaleDateString('es-ES', opciones);
}