import os
from dotenv import load_dotenv
from crewai import LLM

load_dotenv()

# Centraliza a inteligência do projeto
nexus_llm = LLM(
   model="openrouter/inclusionai/ling-3.0-flash-vl:free",
    api_key=os.getenv("OPENROUTER_API_KEY"),
    temperature=0.2
)