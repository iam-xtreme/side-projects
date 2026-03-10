import json
import os
from pathlib import Path

from openai import AsyncOpenAI


CONFIG_PATH = Path(__file__).parent.parent / "config.json"


class LLMProvider:
    def __init__(self, config_path: str | None = None):
        with open(config_path or CONFIG_PATH) as f:
            self._config = json.load(f)
        self._clients: dict[str, AsyncOpenAI] = {}

    def _get_client(self, provider_name: str) -> AsyncOpenAI:
        if provider_name not in self._clients:
            provider_cfg = self._config["providers"][provider_name]
            api_key = os.environ.get(provider_cfg["env_key"])
            if not api_key:
                raise ValueError(
                    f"Missing environment variable '{provider_cfg['env_key']}' "
                    f"for provider '{provider_name}'"
                )
            self._clients[provider_name] = AsyncOpenAI(
                api_key=api_key,
                base_url=provider_cfg["base_url"],
            )
        return self._clients[provider_name]

    def get_agent_config(self, agent_id: str) -> dict:
        agents = self._config.get("agents", {})
        if agent_id not in agents:
            raise ValueError(f"Agent '{agent_id}' not found in config")
        return agents[agent_id]

    async def chat_completion(
        self,
        agent_id: str,
        user_message: str,
        extra_system: str = "",
    ) -> str:
        agent_cfg = self.get_agent_config(agent_id)
        client = self._get_client(agent_cfg["provider"])

        system_prompt = agent_cfg["system_prompt"]
        if extra_system:
            system_prompt = f"{system_prompt}\n\n{extra_system}"

        response = await client.chat.completions.create(
            model=agent_cfg["model"],
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            temperature=agent_cfg.get("temperature", 0.7),
            max_tokens=agent_cfg.get("max_tokens", 1500),
        )
        return response.choices[0].message.content or ""
