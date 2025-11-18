import requests
import json

class LLMInterface:
    def __init__(self, config):
        use_config=config['use']
        self.use_local = True if use_config is None or use_config == "local" else False
        self.api_config=config[use_config]

    def generate(self, prompt, model):
        if self.use_local:
            return self.__invoke_local(prompt, model)
        else:
            return self.__invoke_groq(prompt, model)

    def  __invoke_local(self, prompt, model):
        response = requests.post(
            self.api_config['url'],
            json={
                "model": model,
                "prompt": prompt,
                "stream": False
            }
        )
        return response.json()['response']

    def __invoke_groq(self, prompt, model):
        headers = {
            "Authorization": f"Bearer {self.api_config['apiKey']}",
            "Content-Type": "application/json"
        }
        response = requests.post(
            self.api_config['url'],
            headers=headers,
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        return response.json()['choices'][0]['message']['content']

    