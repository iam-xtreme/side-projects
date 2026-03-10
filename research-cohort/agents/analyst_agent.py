from agents.base_agent import BaseAgent, AgentResult


class AnalystAgent(BaseAgent):
    async def invoke(self, topic: str, session_id: str) -> AgentResult:
        try:
            responses = self.memory.get_session_responses(session_id)

            if not responses:
                return AgentResult(
                    agent_id=self.agent_id,
                    agent_name=self.agent_name,
                    model=self.model,
                    response_text="No research responses available to analyze.",
                    session_id=session_id,
                    error="No responses found in session",
                )

            context_parts = []
            for resp in responses:
                context_parts.append(
                    f"### {resp['agent_name']} (model: {resp['model']})\n\n{resp['response_text']}"
                )
            context = "\n\n---\n\n".join(context_parts)

            user_message = (
                f"Topic: **{topic}**\n\n"
                f"Below are research responses from {len(responses)} agents:\n\n"
                f"{context}\n\n"
                f"Please evaluate these responses and provide your synthesis."
            )

            response_text = await self.provider.chat_completion(
                agent_id=self.agent_id,
                user_message=user_message,
            )

            self.memory.save_analyst_evaluation(
                session_id=session_id,
                recommendation=response_text,
            )
            self.memory.complete_session(session_id)

            return AgentResult(
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                model=self.model,
                response_text=response_text,
                session_id=session_id,
            )
        except Exception as exc:
            error_msg = f"Analyst error: {exc}"
            return AgentResult(
                agent_id=self.agent_id,
                agent_name=self.agent_name,
                model=self.model,
                response_text="",
                session_id=session_id,
                error=error_msg,
            )
