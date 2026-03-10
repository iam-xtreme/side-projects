from agents.base_agent import BaseAgent, AgentResult


class ResearchAgent(BaseAgent):
    async def invoke(self, topic: str, session_id: str) -> AgentResult:
        try:
            response_text = await self.provider.chat_completion(
                agent_id=self.agent_id,
                user_message=f"Research the following topic thoroughly: {topic}",
            )
            self.memory.save_agent_response(
                session_id=session_id,
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                model=self.model,
                response_text=response_text,
            )
            return AgentResult(
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                model=self.model,
                response_text=response_text,
                session_id=session_id,
            )
        except Exception as exc:
            error_msg = f"Error from {self.agent_name}: {exc}"
            return AgentResult(
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                model=self.model,
                response_text="",
                session_id=session_id,
                error=error_msg,
            )
