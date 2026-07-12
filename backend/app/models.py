from pydantic import BaseModel, Field
from typing import List, Optional

class Entity(BaseModel):
    name: str = Field(description="Nombre completo de la persona u organización.")
    role: str = Field(description="Rol específico en el caso: 'víctima', 'agresor', 'demandante', 'demandado', 'abogado_defensor', 'abogado_acusador', 'juez', 'testigo', o 'otro'.")
    context: Optional[str] = Field(description="Breve descripción o contexto de su participación en el expediente.")

class JudicialFileAnalysis(BaseModel):
    case_number: Optional[str] = Field(description="Número del expediente judicial, si está disponible.")
    court_name: Optional[str] = Field(description="Nombre del tribunal, juzgado o entidad judicial.")
    date: Optional[str] = Field(description="Fecha principal del documento o de los hechos (formato YYYY-MM-DD o texto).")
    crime_or_subject: Optional[str] = Field(description="Delito, materia o asunto principal del expediente (ej. Homicidio, Divorcio, Robo, etc.).")
    summary: str = Field(description="Resumen narrativo conciso y claro de los hechos descritos en el expediente.")
    entities: List[Entity] = Field(description="Lista de todas las personas u organizaciones involucradas identificadas en el texto.")
    key_points: List[str] = Field(description="Puntos o acontecimientos clave ordenados de manera relevante.")
    suggested_steps: List[str] = Field(description="Pasos o recomendaciones sugeridas para el análisis del caso por parte del tribunal.")
