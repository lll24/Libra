import os
import time
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import ThreadedConnectionPool

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://libra_user:libra_password@db:5432/libra_db")

# Pool de conexiones global (mínimo 1 conexión, máximo 10)
db_pool = None

def get_connection():
    """Retorna una conexión a la base de datos PostgreSQL desde el pool con reintentos."""
    global db_pool
    if db_pool is None:
        retries = 10
        while retries > 0:
            try:
                db_pool = ThreadedConnectionPool(1, 10, dsn=DATABASE_URL)
                print("Pool de conexiones de base de datos PostgreSQL inicializado (mínimo: 1, máximo: 10)")
                break
            except psycopg2.OperationalError as e:
                print(f"Esperando a la base de datos PostgreSQL... {retries} reintentos restantes. Error: {e}")
                retries -= 1
                time.sleep(2)
        if db_pool is None:
            raise Exception("No se pudo conectar a la base de datos PostgreSQL")
            
    return db_pool.getconn()

def release_connection(conn):
    """Devuelve la conexión al pool en lugar de cerrarla físicamente."""
    global db_pool
    if db_pool and conn:
        try:
            db_pool.putconn(conn)
        except Exception as e:
            print(f"Error al devolver conexión al pool: {e}")

def init_db():
    """Inicializa el esquema de base de datos creando las tablas necesarias."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Crear tabla documents
            cur.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id VARCHAR(255) PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    content TEXT NOT NULL,
                    case_number VARCHAR(255),
                    court_name VARCHAR(255),
                    date VARCHAR(255),
                    crime_or_subject VARCHAR(255),
                    summary TEXT,
                    status VARCHAR(50) NOT NULL DEFAULT 'draft'
                );
            """)
            # Crear tabla entities
            cur.execute("""
                CREATE TABLE IF NOT EXISTS entities (
                    id SERIAL PRIMARY KEY,
                    document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL,
                    cedula VARCHAR(100),
                    role VARCHAR(100),
                    context TEXT
                );
            """)
            # Crear tabla incidents
            cur.execute("""
                CREATE TABLE IF NOT EXISTS incidents (
                    id SERIAL PRIMARY KEY,
                    document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
                    note TEXT NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'open',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            conn.commit()
            print("Tablas de base de datos PostgreSQL inicializadas correctamente.")
    except Exception as e:
        conn.rollback()
        print(f"Error al inicializar la base de datos: {e}")
        raise e
    finally:
        release_connection(conn)

def save_document(doc_id, filename, content, case_number=None, court_name=None, date=None, crime_or_subject=None, summary=None, status='draft'):
    """Guarda o actualiza un documento en la base de datos."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO documents (id, filename, content, case_number, court_name, date, crime_or_subject, summary, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    content = EXCLUDED.content,
                    case_number = COALESCE(EXCLUDED.case_number, documents.case_number),
                    court_name = COALESCE(EXCLUDED.court_name, documents.court_name),
                    date = COALESCE(EXCLUDED.date, documents.date),
                    crime_or_subject = COALESCE(EXCLUDED.crime_or_subject, documents.crime_or_subject),
                    summary = COALESCE(EXCLUDED.summary, documents.summary),
                    status = EXCLUDED.status;
            """, (doc_id, filename, content, case_number, court_name, date, crime_or_subject, summary, status))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error al guardar documento {doc_id}: {e}")
        raise e
    finally:
        release_connection(conn)

def save_entities(doc_id, entities_list):
    """Guarda las entidades asociadas a un documento, eliminando las previas para evitar duplicados."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Eliminar entidades previas para este documento
            cur.execute("DELETE FROM entities WHERE document_id = %s;", (doc_id,))
            
            for ent in entities_list:
                name = ent.get("name")
                cedula = ent.get("cedula")
                role = ent.get("role")
                context = ent.get("context")
                if name:
                    cur.execute("""
                        INSERT INTO entities (document_id, name, cedula, role, context)
                        VALUES (%s, %s, %s, %s, %s);
                    """, (doc_id, name, cedula, role, context))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error al guardar entidades para {doc_id}: {e}")
        raise e
    finally:
        release_connection(conn)

def update_document_status(doc_id, status):
    """Actualiza el estado de un expediente."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE documents SET status = %s WHERE id = %s;", (status, doc_id))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error al actualizar estado de {doc_id}: {e}")
        raise e
    finally:
        release_connection(conn)

def report_incident(doc_id, note):
    """Reporta un incidente para un documento y cambia su estado a 'incident'."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Crear incidente
            cur.execute("""
                INSERT INTO incidents (document_id, note, status)
                VALUES (%s, %s, 'open');
            """, (doc_id, note))
            # Actualizar estado de documento
            cur.execute("UPDATE documents SET status = 'incident' WHERE id = %s;", (doc_id,))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error al reportar incidente para {doc_id}: {e}")
        raise e
    finally:
        release_connection(conn)

def resolve_incident(incident_id):
    """Resuelve un incidente y regresa el estado del documento a 'validated'."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Obtener ID de documento asociado
            cur.execute("SELECT document_id FROM incidents WHERE id = %s;", (incident_id,))
            row = cur.fetchone()
            if row:
                doc_id = row[0]
                # Resolver incidente
                cur.execute("UPDATE incidents SET status = 'resolved' WHERE id = %s;", (incident_id,))
                # Regresar a validado
                cur.execute("UPDATE documents SET status = 'validated' WHERE id = %s;", (doc_id,))
                conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error al resolver incidente {incident_id}: {e}")
        raise e
    finally:
        release_connection(conn)

def get_incidents():
    """Obtiene el listado de incidentes abiertos con datos del expediente asociado."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT i.id, i.document_id, i.note, i.status, i.created_at, d.filename, d.case_number
                FROM incidents i
                JOIN documents d ON i.document_id = d.id
                WHERE i.status = 'open'
                ORDER BY i.created_at DESC;
            """)
            return list(cur.fetchall())
    except Exception as e:
        print(f"Error al obtener incidentes: {e}")
        return []
    finally:
        release_connection(conn)

def search_documents(query_str):
    """
    Busca causas en la base de datos por:
    - Número de caso/expediente
    - Cédula de identidad (búsqueda exacta o parcial)
    - Nombre del involucrado (búsqueda insensible a mayúsculas/minúsculas)
    """
    conn = get_connection()
    try:
        # Sanitizar query
        q = f"%{query_str}%"
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT DISTINCT d.id, d.filename, d.content, d.case_number, d.court_name, d.date, d.crime_or_subject, d.summary, d.status
                FROM documents d
                LEFT JOIN entities e ON d.id = e.document_id
                WHERE d.case_number ILIKE %s 
                   OR d.filename ILIKE %s
                   OR d.content ILIKE %s
                   OR e.cedula ILIKE %s 
                   OR e.name ILIKE %s
                ORDER BY d.id DESC;
            """, (q, q, q, q, q))
            docs = list(cur.fetchall())
            
            # Para cada documento, recuperar sus entidades
            for doc in docs:
                cur.execute("""
                    SELECT name, role, context, cedula 
                    FROM entities 
                    WHERE document_id = %s;
                """, (doc["id"],))
                doc["entities"] = list(cur.fetchall())
                
            return docs
    except Exception as e:
        print(f"Error en búsqueda de causas: {e}")
        return []
    finally:
        release_connection(conn)
