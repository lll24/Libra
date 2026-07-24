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
            # Activar extensión pgvector si está disponible
            try:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                conn.commit()
                print("Extensión pgvector activada correctamente.")
            except Exception as vector_err:
                conn.rollback()
                print(f"Advertencia al crear la extensión vector: {vector_err}")

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
            # Agregar columnas de folios y piezas si no existen
            cur.execute("""
                ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 1;
                ALTER TABLE documents ADD COLUMN IF NOT EXISTS pieza_number INTEGER;
                ALTER TABLE documents ADD COLUMN IF NOT EXISTS start_folio INTEGER;
                ALTER TABLE documents ADD COLUMN IF NOT EXISTS end_folio INTEGER;
            """)
            # Crear tabla de fragmentos vectoriales
            cur.execute("""
                CREATE TABLE IF NOT EXISTS document_chunks (
                    id SERIAL PRIMARY KEY,
                    document_id VARCHAR(255) REFERENCES documents(id) ON DELETE CASCADE,
                    chunk_index INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    embedding vector(768)
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

def save_document(doc_id, filename, content, case_number=None, court_name=None, date=None, crime_or_subject=None, summary=None, status='draft', page_count=1, pieza_number=None, start_folio=None, end_folio=None):
    """Guarda o actualiza un documento en la base de datos."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO documents (id, filename, content, case_number, court_name, date, crime_or_subject, summary, status, page_count, pieza_number, start_folio, end_folio)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    content = EXCLUDED.content,
                    case_number = COALESCE(EXCLUDED.case_number, documents.case_number),
                    court_name = COALESCE(EXCLUDED.court_name, documents.court_name),
                    date = COALESCE(EXCLUDED.date, documents.date),
                    crime_or_subject = COALESCE(EXCLUDED.crime_or_subject, documents.crime_or_subject),
                    summary = COALESCE(EXCLUDED.summary, documents.summary),
                    status = EXCLUDED.status,
                    page_count = COALESCE(EXCLUDED.page_count, documents.page_count),
                    pieza_number = COALESCE(EXCLUDED.pieza_number, documents.pieza_number),
                    start_folio = COALESCE(EXCLUDED.start_folio, documents.start_folio),
                    end_folio = COALESCE(EXCLUDED.end_folio, documents.end_folio);
            """, (doc_id, filename, content, case_number, court_name, date, crime_or_subject, summary, status, page_count, pieza_number, start_folio, end_folio))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error al guardar documento {doc_id}: {e}")
        raise e
    finally:
        release_connection(conn)

def assign_document_folios(doc_id, case_number):
    """Calcula y asigna secuencialmente la pieza y el rango de folios para un documento en un expediente."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Obtener page_count del documento actual
            cur.execute("SELECT page_count FROM documents WHERE id = %s;", (doc_id,))
            doc = cur.fetchone()
            if not doc:
                raise Exception(f"Documento no encontrado: {doc_id}")
            
            page_count = doc.get("page_count", 1) or 1
            
            # 2. Consultar el estado actual de las piezas para este case_number.
            # Obtenemos el último documento ya asignado a ese caso con pieza_number
            cur.execute("""
                SELECT id, page_count, pieza_number, start_folio, end_folio 
                FROM documents 
                WHERE case_number = %s AND pieza_number IS NOT NULL AND id != %s
                ORDER BY pieza_number DESC, end_folio DESC 
                LIMIT 1;
            """, (case_number, doc_id))
            last_doc = cur.fetchone()
            
            if not last_doc:
                # Es el primer documento asignado a este expediente
                pieza_number = 1
                start_folio = 1
                end_folio = page_count
            else:
                current_pieza = last_doc["pieza_number"]
                last_end_folio = last_doc["end_folio"]
                
                # Verificar si cabe en la pieza actual (límite 200 folios)
                if last_end_folio + page_count <= 200:
                    pieza_number = current_pieza
                    start_folio = last_end_folio + 1
                    end_folio = last_end_folio + page_count
                else:
                    # No cabe, pasamos a la pieza siguiente
                    pieza_number = current_pieza + 1
                    start_folio = 1
                    end_folio = page_count
            
            # 3. Guardar asignación
            cur.execute("""
                UPDATE documents 
                SET case_number = %s, pieza_number = %s, start_folio = %s, end_folio = %s 
                WHERE id = %s;
            """, (case_number, pieza_number, start_folio, end_folio, doc_id))
            conn.commit()
            
            print(f"Documento {doc_id} asignado a expediente {case_number}, Pieza {pieza_number}, Folios {start_folio}-{end_folio}")
            return pieza_number
    except Exception as e:
        conn.rollback()
        print(f"Error al asignar folios a {doc_id}: {e}")
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
    """Resuelve un incidente y regresa el estado del documento a 'draft'."""
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
                # Regresar a borrador (base)
                cur.execute("UPDATE documents SET status = 'draft' WHERE id = %s;", (doc_id,))
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

def search_documents(query_str, role=None):
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
            if role == "reader_user":
                cur.execute("""
                    SELECT DISTINCT d.id, d.filename, d.content, d.case_number, d.court_name, d.date, d.crime_or_subject, d.summary, d.status
                    FROM documents d
                    LEFT JOIN entities e ON d.id = e.document_id
                    WHERE (d.case_number ILIKE %s 
                       OR d.filename ILIKE %s
                       OR d.content ILIKE %s
                       OR e.cedula ILIKE %s 
                       OR e.name ILIKE %s)
                       AND d.status != 'incident'
                    ORDER BY d.id DESC;
                """, (q, q, q, q, q))
            else:
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

def save_document_chunk(doc_id, chunk_index, content, embedding):
    """Guarda un fragmento de documento con su vector en la base de datos."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # pgvector acepta listas de float directamente como string '[0.1, 0.2, ...]'
            emb_str = "[" + ",".join(map(str, embedding)) + "]"
            cur.execute("""
                INSERT INTO document_chunks (document_id, chunk_index, content, embedding)
                VALUES (%s, %s, %s, %s);
            """, (doc_id, chunk_index, content, emb_str))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error al guardar fragmento del documento {doc_id}: {e}")
        raise e
    finally:
        release_connection(conn)

def delete_document_chunks(doc_id):
    """Elimina todos los fragmentos vectoriales asociados a un documento."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM document_chunks WHERE document_id = %s;", (doc_id,))
            conn.commit()
    except Exception as e:
        conn.rollback()
        print(f"Error al eliminar fragmentos de {doc_id}: {e}")
        raise e
    finally:
        release_connection(conn)

def search_relevant_chunks(case_number, query_embedding, limit=5):
    """Realiza una búsqueda semántica de fragmentos relevantes para un expediente."""
    conn = get_connection()
    try:
        emb_str = "[" + ",".join(map(str, query_embedding)) + "]"
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT c.content, c.chunk_index, d.filename, d.start_folio, d.end_folio
                FROM document_chunks c
                JOIN documents d ON c.document_id = d.id
                WHERE d.case_number = %s AND d.status != 'incident'
                ORDER BY c.embedding <=> %s::vector
                LIMIT %s;
            """, (case_number, emb_str, limit))
            return list(cur.fetchall())
    except Exception as e:
        print(f"Error al realizar búsqueda vectorial en {case_number}: {e}")
        return []
    finally:
        release_connection(conn)

 # WHERE d.case_number = %s AND d.status = 'validated'