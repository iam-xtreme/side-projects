from openai import OpenAI

class LLMInterface:
    def __init__(self, config):
        use_config = config['use']
        self.use_local = True if use_config is None or use_config == "local" else False
        self.api_config = config[use_config]
        self.model = self.api_config.get('model')
        
        # Initialize OpenAI client with custom base URL if provided
        if self.use_local:
            # Local LLM server (e.g., Ollama)
            self.client = OpenAI(
                base_url=self.api_config.get('url', 'http://localhost:11434/v1'),
                api_key='not-required'  # Local servers typically don't need an API key
            )
        else:
            # Remote providers (Groq, OpenRouter, etc.)
            self.client = OpenAI(
                base_url=self.api_config.get('url'),
                api_key=self.api_config['apiKey']
            )

    def generate(self, prompt, model=None):
        """
        Generate a response from the LLM.
        
        Args:
            prompt: The input prompt to send to the LLM
            model: The model to use (optional, uses config default if not provided)
            
        Returns:
            The generated response text
        """
        use_model = model or self.model
        
        response = self.client.chat.completions.create(
            model=use_model,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.choices[0].message.content
