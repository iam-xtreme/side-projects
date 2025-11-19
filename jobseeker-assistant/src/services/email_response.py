class EmailResponse:
    def __init__(self, config, llm_interface):
        self.config=config
        self.llm=llm_interface

    def response(self, message):
        template=self.config['prompt']
        model=self.config['model']
        prompt = template.format(message=message)
        return self.llm.generate(prompt, model)

