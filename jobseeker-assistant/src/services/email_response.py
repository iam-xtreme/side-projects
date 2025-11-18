class EmailResponse:
    def __init__(self, config, llm_interface):
        self.config=config
        self.llm=llm_interface

    def response(self, message):
        prompt=self.config['prompt']
        model=self.config['model']
        return self.llm.generate(prompt, model)
    
    def get_fields(self):
        return self.config['input']
