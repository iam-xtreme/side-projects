import asyncio
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# Load .env from project root
load_dotenv(Path(__file__).parent / ".env")

from agents.analyst_agent import AnalystAgent
from agents.research_agent import ResearchAgent
from providers.llm_provider import LLMProvider
from tools.shared_memory import SharedMemory
from ui.layout import create_ui


def build_agents():
    provider = LLMProvider()
    memory = SharedMemory()
    agent1 = ResearchAgent("research_agent_1", provider, memory)
    agent2 = ResearchAgent("research_agent_2", provider, memory)
    agent3 = ResearchAgent("research_agent_3", provider, memory)
    analyst = AnalystAgent("analyst_agent", provider, memory)
    return memory, agent1, agent2, agent3, analyst


async def run_research(topic: str):
    memory, agent1, agent2, agent3, analyst = build_agents()
    session_id = memory.create_session(topic)

    # Run all 3 research agents concurrently
    results = await asyncio.gather(
        agent1.invoke(topic, session_id),
        agent2.invoke(topic, session_id),
        agent3.invoke(topic, session_id),
        return_exceptions=False,
    )

    # Analyst synthesizes after all 3 complete
    analyst_result = await analyst.invoke(topic, session_id)

    return results[0], results[1], results[2], analyst_result


def main():
    demo = create_ui(run_research)
    demo.queue()
    demo.launch(server_name="0.0.0.0", server_port=7860, share=False)


if __name__ == "__main__":
    main()
