const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

// permite que el frontend pueda hacer peticiones al backend
app.use(cors());
// para recibir datos en formato JSON
app.use(express.json());

// datos de conexion a MySQL, vienen de las variables de entorno del docker-compose
const dbConfig = {
    host: process.env.MYSQL_HOST || 'localhost',
    user: process.env.MYSQL_USER || 'prestamos_user',
    password: process.env.MYSQL_PASSWORD || 'prestamos_password',
    database: process.env.MYSQL_DATABASE || 'uniprestamos',
    waitForConnections: true, // espera si no hay conexiones disponibles
    connectionLimit: 10, // maximo de conexiones al tiempo
    queueLimit: 0 // sin limite de peticiones en cola
};

let pool;

// conecta a la base de datos y crea la tabla si no existe
// si falla reintenta cada 5 segundos porque MySQL puede tardar en arrancar
async function initDatabase() {
    try {
        pool = mysql.createPool(dbConfig);
        
        // define la estructura de la tabla de prestamos
        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS prestamos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                estudiante VARCHAR(255) NOT NULL,
                item VARCHAR(255) NOT NULL,
                tipo ENUM('libro', 'equipo', 'revista') NOT NULL,
                fecha_devolucion DATE NOT NULL,
                estado ENUM('activo', 'devuelto') DEFAULT 'activo',
                fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `;
        
        await pool.execute(createTableQuery);
        console.log('Conexion a MySQL establecida correctamente');
        console.log('Tabla prestamos verificada/creada');
    } catch (error) {
        console.error('Error conectando a MySQL:', error.message);
        console.log('Reintentando en 5 segundos...');
        setTimeout(initDatabase, 5000);
    }
}

// verifica si el backend y la base de datos estan activos
app.get('/health', async (req, res) => {
    try {
        // consulta minima para verificar que la conexion funciona
        await pool.execute('SELECT 1');
        res.json({ 
            status: 'ok', 
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        // si falla la consulta, la base de datos no esta disponible
        res.json({ 
            status: 'ok', 
            database: 'disconnected',
            timestamp: new Date().toISOString()
        });
    }
});

// retorna todos los prestamos activos ordenados por fecha de creacion
app.get('/prestamos', async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM prestamos WHERE estado = "activo" ORDER BY fecha_creacion DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error obteniendo prestamos:', error);
        res.status(500).json({ error: 'Error al obtener prestamos' });
    }
});

// registra un nuevo prestamo, valida que vengan todos los campos
app.post('/prestamos', async (req, res) => {
    const { estudiante, item, tipo, fecha_devolucion } = req.body;

    // si falta algun campo retorna error 400
    if (!estudiante || !item || !tipo || !fecha_devolucion) {
        return res.status(400).json({ 
            error: 'Todos los campos son requeridos: estudiante, item, tipo, fecha_devolucion' 
        });
    }

    try {
        // los ? evitan SQL injection al separar la consulta de los datos
        const [result] = await pool.execute(
            'INSERT INTO prestamos (estudiante, item, tipo, fecha_devolucion) VALUES (?, ?, ?, ?)',
            [estudiante, item, tipo, fecha_devolucion]
        );
        // retorna el prestamo creado con el id generado por MySQL
        res.status(201).json({
            id: result.insertId,
            estudiante,
            item,
            tipo,
            fecha_devolucion,
            estado: 'activo',
            message: 'Prestamo registrado exitosamente'
        });
    } catch (error) {
        console.error('Error creando prestamo:', error);
        res.status(500).json({ error: 'Error al registrar prestamo' });
    }
});

// en vez de eliminar el registro lo marcamos como devuelto para mantener historial
app.delete('/prestamos/:id', async (req, res) => {
    const id = parseInt(req.params.id); // convierte el id de string a numero

    try {
        const [result] = await pool.execute(
            'UPDATE prestamos SET estado = "devuelto" WHERE id = ?',
            [id]
        );
        // si no encontro el id retorna error 404
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Prestamo no encontrado' });
        }

        res.json({ message: 'Prestamo marcado como devuelto', id });
    } catch (error) {
        console.error('Error actualizando prestamo:', error);
        res.status(500).json({ error: 'Error al actualizar prestamo' });
    }
});

// inicia el servidor y llama a la funcion de conexion con la base de datos
app.listen(PORT, async () => {
    console.log(`Backend UniPrestamos corriendo en puerto ${PORT}`);
    await initDatabase();
});
