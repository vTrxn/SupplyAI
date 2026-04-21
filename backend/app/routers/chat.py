# backend/app/routers/chat.py
import os
from fastapi import APIRouter, Depends
from fastapi.security import HTTPBearer
from pydantic import BaseModel
from dotenv import load_dotenv
from groq import AsyncGroq

from app.utils.jwt import decode_token

# Cargar variables del .env
load_dotenv()

router = APIRouter(prefix="/ai", tags=["Asistente IA"])
security = HTTPBearer()

# Intentamos inicializar el cliente de Groq si hay API key
groq_api_key = os.getenv("GROQ_API_KEY", "").strip()
client = AsyncGroq(api_key=groq_api_key) if groq_api_key else None


class ChatRequest(BaseModel):
    message: str
    context: str | None = None


@router.post("/chat")
async def chat(
    req: ChatRequest,
    credentials=Depends(security),
):
    decode_token(credentials.credentials)  # Validar token

    if not client:
        return {
            "response": "⚠️ Parece que el backend no tiene configurada tu GROQ_API_KEY en el `.env`. Por favor avísame para revisarlo."
        }
    
    ctx_info = req.context or "Sin datos concretos en este momento."

    system_prompt = f"""Eres el Analista Predictivo Inteligente de SupplyAI, un experto altamente especializado en gestión logística e inventarios.

Tu tono debe ser directo, inteligente, cercano y 100% conversacional (nunca suenes como un robot leyendo una plantilla). Eres un miembro clave del equipo del usuario.

ESTADO ACTUAL DE LA EMPRESA (Tómalo siempre en cuenta para dar respuestas contextualizadas):
{ctx_info}

Reglas estrictas:
- Respuestas relativamente cortas y al grano.
- Si te hacen una pregunta ambigua ("hola", "¿tienes memoria?", etc.), responde de manera humana y cortés, enfocando la conversación sutilmente a cómo puedes ayudar a la empresa.
- Eres consciente de que actualmente evalúas las preguntas individualmente, usando este contexto inyectado como tu principal fuente de conocimiento.
- USA formato markdown para resaltar cosas importantes en **negrita**, pero no abuses de las litas genéricas."""

    try:
        chat_completion = await client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": req.message,
                }
            ],
            model="llama-3.1-8b-instant",  # Modelo estándar súper rápido y soportado por Groq
            temperature=0.5,         # Equilibrado entre predictibilidad y creatividad
            max_tokens=600,
        )
        
        response = chat_completion.choices[0].message.content
        
    except Exception as e:
        response = f"⚠️ Ocurrió un error al procesar tu respuesta con Inteligencia Artificial. Detalle: {str(e)}"

    return {"response": response}
