from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class AgentResult:
    agent_id: str
    agent_name: str
    model: str
    response_text: str
    session_id: str
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    error: str = ""

    @property
    def success(self) -> bool:
        return not self.error


class BaseAgent(ABC):
    def __init__(self, agent_id: str, provider, memory):
        self.agent_id = agent_id
        self.provider = provider
        self.memory = memory
        cfg = provider.get_agent_config(agent_id)
        self.agent_name: str = cfg["name"]
        self.model: str = cfg["model"]

    @abstractmethod
    async def invoke(self, topic: str, session_id: str) -> AgentResult:
        """Run the agent on a topic and return a result."""
